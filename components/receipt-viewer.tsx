'use client'

import { useState, useRef, useEffect } from 'react'
import { ZoomIn } from 'lucide-react'
import styles from './receipt-viewer.module.css'

interface ReceiptViewerProps {
    fileUrl: string | null
    alt?: string
}

export function ReceiptViewer({ fileUrl, alt = "Comprobante" }: ReceiptViewerProps) {
    const [scale, setScale] = useState(1)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [startPos, setStartPos] = useState({ x: 0, y: 0 })

    const containerRef = useRef<HTMLDivElement>(null)

    if (!fileUrl) return null

    const isPdf = fileUrl.toLowerCase().endsWith('.pdf')

    if (isPdf) {
        return <iframe src={fileUrl} className={styles.iframe} title={alt} />
    }

    const handleWheel = (e: React.WheelEvent) => {
        // Prevent default window scrolling if zooming
        e.stopPropagation();

        const zoomSensitivity = 0.001
        const delta = -e.deltaY * zoomSensitivity
        const newScale = Math.min(Math.max(1, scale + delta), 4) // Min z1, Max z4

        setScale(newScale)

        // Reset position if zoomed out to 1
        if (newScale === 1) {
            setPosition({ x: 0, y: 0 })
        }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true)
            setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y })
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            const newX = e.clientX - startPos.x
            const newY = e.clientY - startPos.y
            setPosition({ x: newX, y: newY })
        }
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    const handleMouseLeave = () => {
        setIsDragging(false)
    }

    return (
        <div
            className={styles.imageContainer}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            ref={containerRef}
            title="Usa la rueda para zoom, click y arrastra para mover"
        >
            <div className={styles.zoomHint}>
                <span className="flex items-center gap-1">
                    <ZoomIn size={12} /> Zoom: Rueda | Mover: Click
                </span>
            </div>

            <div
                className={styles.panWrapper}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
            >
                <img
                    src={fileUrl}
                    alt={alt}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none' // Prevent default drag behavior of img
                    }}
                />
            </div>
        </div>
    )
}
