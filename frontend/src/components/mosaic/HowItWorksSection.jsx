import React from 'react';
import GlassSurface from '../reactbits/GlassSurface';
import '../../styles/mosaic.css';

const StepCard = ({ title, scanText, secondText }) => (
    <GlassSurface className="mosaic-step-card" borderRadius={36}>
        <h3 className="mosaic-step-title pixel-font">{title}</h3>
        <div className="mosaic-step-desc">
            <span>{scanText}</span>
            <span style={{ marginTop: '1rem', marginBottom: '0.5em', fontSize: '1.2rem', fontWeight: 300 }}>&darr;</span>
            <span>{secondText}</span>
        </div>
    </GlassSurface>
);

const HowItWorksSection = () => {
    return (
        <section className="mosaic-section" id="how-it-works">
            <h2 className="mosaic-section-title">How <span className="pixel-font" style={{ fontWeight: 500, fontSize: "1.33em" }}>MOSAIC</span> Works</h2>
            <div className="mosaic-cards-container">
                <StepCard
                    title="SCAN"
                    scanText="Scan your face to log in"
                    secondText="Select event"
                />
                <StepCard
                    title="RECOGNIZE"
                    scanText="System finds your face in all uploaded photos"
                    secondText="Personal album gets created"
                />
                <StepCard
                    title="DOWNLOAD"
                    scanText="Open album and enjoy"
                    secondText="Download your custom album"
                />
            </div>
        </section>
    );
};

export default HowItWorksSection;
