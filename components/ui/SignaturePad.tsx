'use client'

import { useRef, useEffect, useState } from 'react'

interface SignaturePadProps {
  onSignatureChange: (signature: string | null) => void
  width?: number
  height?: number
}

export default function SignaturePad({ onSignatureChange, width = 400, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Настройка стиля рисования
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Очистка canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }, [width, height])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(x, y)
    ctx.stroke()
    setIsEmpty(false)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    updateSignature()
  }

  const updateSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (isEmpty) {
      onSignatureChange(null)
    } else {
      const dataURL = canvas.toDataURL('image/png')
      onSignatureChange(dataURL)
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    setIsEmpty(true)
    onSignatureChange(null)
  }

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white">
      <div className="mb-2 flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">
          Электронная подпись *
        </label>
        <button
          type="button"
          onClick={clearSignature}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Очистить
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      
      <p className="text-xs text-gray-500 mt-2">
        Нарисуйте вашу подпись в поле выше
      </p>
    </div>
  )
}
