import { useState, useRef, useEffect } from 'react'

function RangeSlider({ min, max, value, onChange, formatValue, parseValue, editable = false }) {
  const [isDragging, setIsDragging] = useState(null)
  const sliderRef = useRef(null)
  const [minVal, maxVal] = value
  const [editingMin, setEditingMin] = useState(false)
  const [editingMax, setEditingMax] = useState(false)
  const [minInputValue, setMinInputValue] = useState('')
  const [maxInputValue, setMaxInputValue] = useState('')

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

  // Constrain input positions to keep them visible (input is ~70px wide, so ~35px on each side)
  // We'll use a minimum offset of ~5% from edges to keep inputs visible
  const getConstrainedLeft = (percent) => {
    const minOffset = 5 // minimum 5% from left edge
    const maxOffset = 95 // maximum 95% from left edge
    return Math.max(minOffset, Math.min(maxOffset, percent))
  }

  const minInputLeft = getConstrainedLeft(minPercent)
  const maxInputLeft = getConstrainedLeft(maxPercent)

  const handleMinInputFocus = () => {
    setEditingMin(true)
    setMinInputValue(formatValue(minVal))
  }

  const handleMinInputBlur = () => {
    setEditingMin(false)
    if (parseValue && minInputValue !== '') {
      const parsed = parseValue(minInputValue)
      if (!isNaN(parsed) && parsed >= min && parsed <= max) {
        const newMin = Math.min(parsed, maxVal - 1)
        onChange([Math.max(min, newMin), maxVal])
      }
    }
  }

  const handleMinInputChange = (e) => {
    setMinInputValue(e.target.value)
  }

  const handleMinInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    } else if (e.key === 'Escape') {
      setEditingMin(false)
      setMinInputValue(formatValue(minVal))
    }
  }

  const handleMaxInputFocus = () => {
    setEditingMax(true)
    setMaxInputValue(formatValue(maxVal))
  }

  const handleMaxInputBlur = () => {
    setEditingMax(false)
    if (parseValue && maxInputValue !== '') {
      const parsed = parseValue(maxInputValue)
      if (!isNaN(parsed) && parsed >= min && parsed <= max) {
        const newMax = Math.max(parsed, minVal + 1)
        onChange([minVal, Math.min(max, newMax)])
      }
    }
  }

  const handleMaxInputChange = (e) => {
    setMaxInputValue(e.target.value)
  }

  const handleMaxInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    } else if (e.key === 'Escape') {
      setEditingMax(false)
      setMaxInputValue(formatValue(maxVal))
    }
  }

  useEffect(() => {
    if (!editingMin) {
      setMinInputValue(formatValue(minVal))
    }
  }, [minVal, formatValue, editingMin])

  useEffect(() => {
    if (!editingMax) {
      setMaxInputValue(formatValue(maxVal))
    }
  }, [maxVal, formatValue, editingMax])

  return (
    <div className="range-slider-container">
      <div className="range-slider-wrapper">
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
          {editable && parseValue ? (
            <>
              <input
                type="text"
                className="range-slider-input range-slider-input-left"
                style={{ left: `${minInputLeft}%` }}
                value={editingMin ? minInputValue : formatValue(minVal)}
                onFocus={handleMinInputFocus}
                onBlur={handleMinInputBlur}
                onChange={handleMinInputChange}
                onKeyDown={handleMinInputKeyDown}
              />
              <input
                type="text"
                className="range-slider-input range-slider-input-right"
                style={{ left: `${maxInputLeft}%` }}
                value={editingMax ? maxInputValue : formatValue(maxVal)}
                onFocus={handleMaxInputFocus}
                onBlur={handleMaxInputBlur}
                onChange={handleMaxInputChange}
                onKeyDown={handleMaxInputKeyDown}
              />
            </>
          ) : (
            <div className="range-slider-values">
              <span style={{ left: `${minInputLeft}%` }}>{formatValue(minVal)}</span>
              <span style={{ left: `${maxInputLeft}%` }}>{formatValue(maxVal)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RangeSlider
