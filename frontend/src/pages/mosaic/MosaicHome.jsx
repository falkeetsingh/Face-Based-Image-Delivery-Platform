import React, { useEffect } from 'react';
import FloatingHeader from '../../components/mosaic/FloatingHeader';
import HeroSection from '../../components/mosaic/HeroSection';
import IntroSection from '../../components/mosaic/IntroSection';
import HowItWorksSection from '../../components/mosaic/HowItWorksSection';
import CTASection from '../../components/mosaic/CTASection';
import FooterSection from '../../components/mosaic/FooterSection';
import '../../styles/mosaic.css';

const MosaicHome = () => {
    useEffect(() => {
        // Add specific body class for MOSAIC to avoid global layout issues
        document.body.classList.add('mosaic-active');

        return () => {
            document.body.classList.remove('mosaic-active');
        };
    }, []);

    return (
        <div id="mosaic-scroll-container" className="mosaic-scroll-container">
            <FloatingHeader />
            <HeroSection />
            <div className="mosaic-static-bg-wrapper">
                <IntroSection />
                <HowItWorksSection />
                <CTASection />
            </div>
            <FooterSection />
        </div>
    );
};

export default MosaicHome;
