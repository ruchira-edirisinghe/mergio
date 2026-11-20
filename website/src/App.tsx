import { Navbar } from './sections/Navbar';
import { Hero } from './sections/Hero';
import { Info } from './sections/Info';
import { WorksWith } from './sections/WorksWith';
import { Modes } from './sections/Modes';
import { Steps } from './sections/Steps';
import { Faq, Features } from './sections/More';
import { DevNotes } from './sections/DevNotes';
import { DownloadCta, Footer } from './sections/Closing';

export default function App() {
  return (
    <div id="top" className="flex flex-col bg-ink">
      <div className="relative flex flex-col lg:h-screen lg:overflow-hidden">
        <Navbar />
        <Hero />
      </div>
      <main>
        <Info />
        <WorksWith />
        <Modes />
        <Steps />
        <Features />
        <Faq />
        <DevNotes />
        <DownloadCta />
      </main>
      <Footer />
    </div>
  );
}
