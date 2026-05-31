import TopNav from '@/components/TopNav';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import PrivacySection from '@/components/PrivacySection';
import Showcase from '@/components/Showcase';
import WhoItsFor from '@/components/WhoItsFor';
import FinalCTA from '@/components/FinalCTA';
import Footer from '@/components/Footer';

export default function Page() {
  return (
    <div style={{ background: '#07070a', color: '#F5F5F7', minHeight: '100vh', overflow: 'hidden' }}>
      <TopNav/>
      <Hero/>
      <HowItWorks/>
      <PrivacySection/>
      <Showcase/>
      <WhoItsFor/>
      <FinalCTA/>
      <Footer/>
    </div>
  );
}
