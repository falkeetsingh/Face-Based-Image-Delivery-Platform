import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import '../../styles/mosaic.css';

const terminalPromise = import('../reactbits/FaultyTerminal');
const FaultyTerminal = lazy(() => terminalPromise);

const HeroSection = () => {
    const [showTerminal, setShowTerminal] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const mount = () => {
            if (!cancelled) {
                setShowTerminal(true);
            }
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            const idleId = window.requestIdleCallback(mount, { timeout: 1200 });
            return () => {
                cancelled = true;
                window.cancelIdleCallback(idleId);
            };
        }

        const timerId = window.setTimeout(mount, 250);
        return () => {
            cancelled = true;
            window.clearTimeout(timerId);
        };
    }, []);

    const isCoarsePointer = useMemo(
        () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches,
        []
    );
    const prefersReducedMotion = useMemo(
        () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        []
    );
    const terminalDpr = isCoarsePointer ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

    return (
        <section className="mosaic-section" id="hero" style={{ padding: 0 }}>
            <div style={{ width: '100%', height: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {showTerminal ? (
                    <Suspense fallback={<div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, background: 'radial-gradient(circle at center, #2e0018 0%, #050505 80%)' }} />}>
                        <FaultyTerminal
                            scale={1.5}
                            gridMul={[2, 1]}
                            digitSize={1.2}
                            timeScale={0.5}
                            pause={prefersReducedMotion}
                            scanlineIntensity={0.5}
                            glitchAmount={1}
                            flickerAmount={1}
                            noiseAmp={1}
                            chromaticAberration={0}
                            dither={0}
                            curvature={0.1}
                            tint="#ff0095"
                            mouseReact={!isCoarsePointer && !prefersReducedMotion}
                            mouseStrength={0.5}
                            pageLoadAnimation
                            brightness={0.6}
                            dpr={terminalDpr}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
                        />
                    </Suspense>
                ) : null}
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
