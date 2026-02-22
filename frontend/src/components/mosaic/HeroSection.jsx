import React from 'react';
import FaultyTerminal from '../reactbits/FaultyTerminal';
import '../../styles/mosaic.css';

const HeroSection = () => {
    return (
        <section className="mosaic-section" id="hero" style={{ padding: 0 }}>
            <div style={{ width: '100%', height: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaultyTerminal
                    scale={1.5}
                    gridMul={[2, 1]}
                    digitSize={1.2}
                    timeScale={0.5}
                    pause={false}
                    scanlineIntensity={0.5}
                    glitchAmount={1}
                    flickerAmount={1}
                    noiseAmp={1}
                    chromaticAberration={0}
                    dither={0}
                    curvature={0.1}
                    tint="#ff0095"
                    mouseReact
                    mouseStrength={0.5}
                    pageLoadAnimation
                    brightness={0.6}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
                />
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 2rem' }}>
                    <h1 className="mosaic-title">
                        <span style={{ whiteSpace: 'nowrap' }}>MOMENTS THAT CONNECT US,</span><br />
                        <span style={{ whiteSpace: 'nowrap' }}>POWERED BY SMART RECOGNITION</span>
                    </h1>
                    <p className="mosaic-subtitle">
                        Transforming society events into meaningful, organized memories<br />
                        where every face and every story matters.
                    </p>
                    <div className="mosaic-hero-actions">
                        <button className="mosaic-btn-primary" onClick={() => document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth' })}>
                            Get Started
                        </button>
                        <button className="mosaic-btn-secondary" onClick={() => document.getElementById('intro')?.scrollIntoView({ behavior: 'smooth' })}>
                            Learn More
                        </button>
                    </div>
                </div>
                {/* Gradient fade to blend with the static background of the next section */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '25vh', background: 'linear-gradient(to bottom, transparent, #0a0a0a)', zIndex: 20, pointerEvents: 'none' }} />
            </div>
        </section>
    );
};

export default HeroSection;
