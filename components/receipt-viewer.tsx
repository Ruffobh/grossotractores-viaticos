'use client'

import { useState, useRef } from 'react'
import { ZoomIn, RotateCw } from 'lucide-react'
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
    const [rotation, setRotation] = useState(0)

    const containerRef = useRef<HTMLDivElement>(null)

    if (!fileUrl) return null

    const isPdf = fileUrl.toLowerCase().endsWith('.pdf')

    if (isPdf) {
        return <iframe src={fileUrl} className={styles.iframe} title={alt} />
    }

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();

        const zoomSensitivity = 0.001
        const delta = -e.deltaY * zoomSensitivity
        const newScale = Math.min(Math.max(1, scale + delta), 4)

        setScale(newScale)

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

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360)
    }

    // Touch support for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        if (scale > 1 && e.touches.length === 1) {
            setIsDragging(true)
            setStartPos({
                x: e.touches[0].clientX - position.x,
                y: e.touches[0].clientY - position.y
            })
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDragging && scale > 1 && e.touches.length === 1) {
            const newX = e.touches[0].clientX - startPos.x
            const newY = e.touches[0].clientY - startPos.y
            setPosition({ x: newX, y: newY })
        }
    }

    const handleTouchEnd = () => {
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
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            ref={containerRef}
            title="Usa la rueda para zoom, click y arrastra para mover"
        >
            {/* Controls Bar */}
            <div className={styles.controlsBar}>
                <span className={styles.controlHint}>
                    <ZoomIn size={12} /> Zoom: Rueda | Mover: Click
                </span>
                <button
                    className={styles.rotateButton}
                    onClick={handleRotate}
                    title="Rotar 90°"
                    type="button"
                >
                    <RotateCw size={14} />
                    <span>Rotar</span>
                </button>
            </div>

            <div
                className={styles.panWrapper}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
            >
                <img
                    src={fileUrl}
                    alt={alt}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none'
                    }}
                />
            </div>
        </div>
    )
}
