#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Project {
    pub owner: Address,
    pub title: String,
    pub goal: i128,    // token tutarları i128 olmalı (Soroban token standardı)
    pub stake: i128,   // İlk aşamada kitlemek istenen tutar
    pub funded: i128,  // Toplanan miktar
    pub is_active: bool,
}

#[contract]
pub struct CommitFundContract;

#[contractimpl]
impl CommitFundContract {
    /// create_project: Yeni bir proje oluşturur ve teminatı (stake) yatırır.
    /// 
    /// Parametreler:
    /// - `env`: Soroban environment.
    /// - `owner`: Projeyi oluşturan kişinin adresi (imzası gereklidir).
    /// - `title`: Projenin adı/başlığı.
    /// - `token_addr`: Teminat olarak alınacak tokenin (XLM) contract adresi.
    /// - `goal`: Hedeflenen fon miktarı.
    /// - `stake`: Proje sahibinin projeye koyduğu başlangıç teminatı.
    pub fn create_project(
        env: Env,
        owner: Address,
        title: String,
        token_addr: Address,
        goal: i128,
        stake: i128,
    ) -> u32 {
        // Proje sahibinin kimliğini doğrula (İşlemi kendisi imzaladığını teyit et).
        owner.require_auth();

        // Token client oluştur ve teminatı proje sahibinden kontrata (escrow) transfer et.
        // Bu adımda escrow mantığı devreye girer.
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&owner, &env.current_contract_address(), &stake);

        // Mevcut proje sayısını çek veya yoksa 0 olarak başlat.
        let mut project_count: u32 = env.storage().instance().get(&"PROJECT_COUNT").unwrap_or(0);
        project_count += 1;

        // Proje verisini hazırla.
        let project = Project {
            owner,
            title,
            goal,
            stake,
            funded: 0,
            is_active: true,
        };

        // Projeyi persistent (kalıcı) belleğe kaydet.
        env.storage().persistent().set(&project_count, &project);
        
        // Yeni proje sayısını instance belleğine kaydet.
        env.storage().instance().set(&"PROJECT_COUNT", &project_count);

        project_count
    }

    /// invest: Belirtilen projeye yatırım yapar ve yatırılan parayı kontrata emanet eder.
    /// 
    /// Parametreler:
    /// - `env`: Soroban environment.
    /// - `investor`: Yatırımı yapan kullanıcının adresi.
    /// - `project_id`: Yatırım yapılmak istenen projenin ID'si.
    /// - `token_addr`: Yatırım için kullanılacak tokenin kontrat adresi (XLM vb).
    /// - `amount`: Yatırım miktarı.
    pub fn invest(
        env: Env,
        investor: Address,
        project_id: u32,
        token_addr: Address,
        amount: i128,
    ) {
        // Yatırımcının kimliğini doğrula (İşlemi kendisi imzaladığını teyit et).
        investor.require_auth();

        // Projeyi kalıcı bellekten (persistent) getir.
        let mut project: Project = env
            .storage()
            .persistent()
            .get(&project_id)
            .expect("HATA: Proje bulunamadi!");

        // Sadece aktif olan projelere yatırım yapılabilir.
        if !project.is_active {
            panic!("HATA: Bu proje aktif degil!");
        }

        // Token transferi: Yatırımcıdan kontratın (CommitFund) kendi adresine token transfer et (Escrow süreci).
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&investor, &env.current_contract_address(), &amount);

        // Projenin toplam toplanan fon miktarını güncelle.
        project.funded += amount;

        // Güncellenmiş proje durumunu tekrar kalıcı belleğe (persistent) kaydet.
        env.storage().persistent().set(&project_id, &project);
    }

    /// get_projects: Sistemde kayıtlı olan tüm projeleri liste halinde döndürür.
    /// 
    /// Dönüş Değeri:
    /// - `Vec<Project>`: Projelerin listesi
    pub fn get_projects(env: Env) -> Vec<Project> {
        // Yeni bir Soroban vektörü oluştur.
        let mut projects = Vec::new(&env);
        
        // Kaydedilmiş toplam proje sayısını al.
        let project_count: u32 = env.storage().instance().get(&"PROJECT_COUNT").unwrap_or(0);

        // Sisteme eklenen projeleri döngü ile tek tek vektöre ekle.
        for id in 1..=project_count {
            if let Some(project) = env.storage().persistent().get::<u32, Project>(&id) {
                projects.push_back(project);
            }
        }

        projects
    }
}
