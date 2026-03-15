"use client";

import { useEffect, useState } from "react";
import HeroSection from "@/components/home/HeroSection";
import CreateProjectForm from "@/components/project/CreateProjectForm";
import ProjectCard from "@/components/project/ProjectCard";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { fetchProjects, ProjectData, initializeContract } from "@/lib/contract";
import { useWallet } from "@/context/WalletContext";

export default function Home() {
  const { isConnected, publicKey } = useWallet();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchProjects();
        setProjects(data);
      } catch (e) {
        console.error("Projeleri çekerken hata:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-base overflow-x-hidden">
      <Navbar />

      <main className="flex-grow">
        <HeroSection />

        <section className="py-24 px-6 max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-12 border-b-brutal border-brutalBlack pb-4">
            <h2 className="text-5xl font-black">ACTIVE CAMPAIGNS</h2>
          </div>

          {loading ? (
            <div className="font-mono text-2xl animate-pulse">LOADING PROTOCOLS...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  title={project.title}
                  ownerStake={project.stake}
                  goal={project.goal}
                  funded={project.funded}
                />
              ))}
            </div>
          )}
        </section>

        <section className="py-12 px-6 border-t-brutal border-brutalBlack bg-brutalBlack text-base">
          <CreateProjectForm />
        </section>
      </main>

      <Footer />
    </div>
  );
}
