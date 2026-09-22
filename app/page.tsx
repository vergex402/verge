import NavBar from "@/components/NavBar";
import Hero from "@/components/Hero";
import CodeSnippet from "@/components/CodeSnippet";
import AgentCommerce from "@/components/AgentCommerce";
import IntegrationMarquee from "@/components/IntegrationMarquee";
import CashbackRewards from "@/components/CashbackRewards";
import SettlementTypes from "@/components/SettlementTypes";
import DataMonetization from "@/components/DataMonetization";
import FrameworkCards from "@/components/FrameworkCards";
import Ecosystem from "@/components/Ecosystem";
import DeveloperPortal from "@/components/DeveloperPortal";
import ContractUpgrades from "@/components/ContractUpgrades";
import Pricing from "@/components/Pricing";
import WhyBase from "@/components/WhyBase";
import ConnectCTA from "@/components/Waitlist";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative bg-[#171719]">
      <NavBar />
      <Hero />
      <CodeSnippet />
      <AgentCommerce />
      <IntegrationMarquee />
      <CashbackRewards />
      <SettlementTypes />
      <DataMonetization />
      <FrameworkCards />
      <Ecosystem />
      <DeveloperPortal />
      <ContractUpgrades />
      <Pricing />
      <WhyBase />
      <ConnectCTA />
      <Footer />
    </main>
  );
}
