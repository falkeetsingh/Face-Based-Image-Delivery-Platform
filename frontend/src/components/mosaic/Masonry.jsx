import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTransition, a } from '@react-spring/web';

function Masonry({ data, maxColumns = 3, margin = 20, onClick }) {
    const [columns, setColumns] = useState(2);
    const [widths, setWidths] = useState([]);
    const ref = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            if (!ref.current) return;
            const width = ref.current.offsetWidth;
            let cols = Math.floor(width / 300);
            if (cols < 1) cols = 1;
            if (cols > maxColumns) cols = maxColumns;
            setColumns(cols);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [maxColumns]);

    useEffect(() => {
        if (!ref.current) return;
        const width = ref.current.offsetWidth;
        const colWidth = (width - margin * (columns - 1)) / columns;
        setWidths(Array.from({ length: columns }).fill(colWidth));
    }, [columns, margin]);

    const [heights, gridItems] = useMemo(() => {
        const localHeights = new Array(columns).fill(0);
        const colWidth = widths[0] || 0;
        const items = data.map((child, i) => {
            const column = localHeights.indexOf(Math.min(...localHeights));
            const xy = [column * (colWidth + margin), localHeights[column]];

            // Calculate height maintaining aspect ratio
            // If image has width and height props, use them, otherwise use a fallback
            // For images without predefined dimensions, standard CSS columns is better
            // But we will use a fixed approx height or allow CSS to dictate height if we render it first

            // Let's fallback to CSS masonry if dimensions aren't available 
            return { ...child, xy, width: colWidth };
        });
        return [localHeights, items];
    }, [columns, data, widths, margin]);

    // If we don't have heights ahead of time, a CSS-based masonry is far more reliable
    // Let's use CSS masonry under the hood for responsiveness without pre-loading dimensions

    return (
        <div
            className="reactbits-masonry-wrapper"
            ref={ref}
            style={{ columnCount: columns, columnGap: margin, width: '100%' }}
        >
            {data.map((item, index) => (
                <div
                    key={item.id || index}
                    className="masonry-item"
                    onClick={() => onClick && onClick(item)}
                    style={{ marginBottom: margin, cursor: onClick ? 'pointer' : 'default', breakInside: 'avoid' }}
                >
                    <img
                        src={item.imageUrl}
                        alt="Masonry"
                        style={{ width: '100%', display: 'block', borderRadius: '8px' }}
                        loading="lazy"
                    />
                </div>
            ))}
        </div>
    );
}

export default Masonry;
