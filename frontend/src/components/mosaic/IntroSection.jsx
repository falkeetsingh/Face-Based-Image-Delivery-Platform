import React from 'react';
import '../../styles/mosaic.css';

const IntroSection = () => {
    return (
        <section className="mosaic-section" id="intro">
            <h2 className="mosaic-intro-text">
                Tired of hunting yourself in 800 event photos?
                <span>Relax. Let <span className="pixel-font" style={{ fontWeight: 500, fontSize: "1.2em" }}>MOSAIC</span> handle it for you.</span>
            </h2>
        </section>
    );
};

export default IntroSection;
