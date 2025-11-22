import { useState, useRef, useEffect } from 'react'

function RangeSlider({ min, max, value, onChange, formatValue }) {
  const [isDragging, setIsDragging] = useState(null)
  const sliderRef = useRef(null)
  const [minVal, maxVal] = value

  const getPercent = (val) => ((val - min) / (max - min)) * 100

  const getValueFromEvent = (e) => {
    if (!sliderRef.current) return null
    const rect = sliderRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    return Math.round(min + (percent / 100) * (max - min))
  }

  useEffect(() => {
    const handleMove = (e) => {
      if (isDragging === null) return

      const newVal = getValueFromEvent(e)
      if (newVal === null) return

      if (isDragging === 'min') {
        const newMin = Math.min(newVal, maxVal - 1)
        onChange([newMin, maxVal])
      } else {
        const newMax = Math.max(newVal, minVal + 1)
        onChange([minVal, newMax])
      }
    }

    const handleEnd = () => {
      setIsDragging(null)
    }

    if (isDragging !== null) {
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleMove, { passive: false })
      document.addEventListener('touchend', handleEnd)

      return () => {
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('mouseup', handleEnd)
        document.removeEventListener('touchmove', handleMove)
        document.removeEventListener('touchend', handleEnd)
      }
    }
  }, [isDragging, min, max, minVal, maxVal, onChange])

  const handleStart = (type, e) => {
    e.preventDefault()
    setIsDragging(type)
  }

  const minPercent = getPercent(minVal)
  const maxPercent = getPercent(maxVal)

  return (
    <div className="range-slider-container">
      <div className="range-slider" ref={sliderRef}>
        <div className="range-slider-track" />
        <div
          className="range-slider-range"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />
        <div
          className="range-slider-thumb range-slider-thumb-left"
          style={{ left: `${minPercent}%` }}
          onMouseDown={(e) => handleStart('min', e)}
          onTouchStart={(e) => handleStart('min', e)}
        />
        <div
          className="range-slider-thumb range-slider-thumb-right"
          style={{ left: `${maxPercent}%` }}
          onMouseDown={(e) => handleStart('max', e)}
          onTouchStart={(e) => handleStart('max', e)}
        />
      </div>
      <div className="range-slider-values">
        <span>{formatValue(minVal)}</span>
        <span>{formatValue(maxVal)}</span>
      </div>
    </div>
  )
}

export default RangeSlider
