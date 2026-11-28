import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Move, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { AlertBanner } from './ui/StateViews';

interface ProfilePictureModalProps {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (croppedBlob: Blob, fileName: string) => Promise<void>;
}

const CROP_STAGE_SIZE = 272;
const OUTPUT_SIZE = 512;

export const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({
  open,
  file,
  onClose,
  onConfirm,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  // Load selected File into an object URL for preview and canvas cropping
  useEffect(() => {
    if (!open || !file) {
      setImageUrl(null);
      setNaturalSize(null);
      setLoadError(null);
      setSaveError(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);
    setLoadError(null);
    setSaveError(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        setLoadError('This file could not be decoded as a valid image.');
        return;
      }
      imgRef.current = img;
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      setLoadError('Unable to read this image file. Please select a valid JPG, PNG, or WEBP.');
    };
    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
      imgRef.current = null;
    };
  }, [open, file]);

  const baseScale = naturalSize
    ? Math.max(CROP_STAGE_SIZE / naturalSize.width, CROP_STAGE_SIZE / naturalSize.height)
    : 1;

  const totalScale = baseScale * zoom;

  const clampOffset = useCallback(
    (nextX: number, nextY: number, scale: number) => {
      if (!naturalSize) return { x: 0, y: 0 };
      const renderedWidth = naturalSize.width * scale;
      const renderedHeight = naturalSize.height * scale;
      const maxOffsetX = Math.max(0, (renderedWidth - CROP_STAGE_SIZE) / 2);
      const maxOffsetY = Math.max(0, (renderedHeight - CROP_STAGE_SIZE) / 2);
      return {
        x: Math.min(maxOffsetX, Math.max(-maxOffsetX, nextX)),
        y: Math.min(maxOffsetY, Math.max(-maxOffsetY, nextY)),
      };
    },
    [naturalSize]
  );

  // Re-clamp offset whenever zoom changes
  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y, totalScale));
  }, [totalScale, clampOffset]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!naturalSize) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.dragging) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    setOffset(
      clampOffset(dragStateRef.current.originX + dx, dragStateRef.current.originY + dy, totalScale)
    );
  };

  const handlePointerUp = () => {
    dragStateRef.current.dragging = false;
  };

  const handleResetCrop = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirmSave = async () => {
    if (!file || !imgRef.current || !naturalSize || saving) return;

    setSaving(true);
    setSaveError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Browser canvas is unavailable for image cropping.');
      }

      const renderedWidth = naturalSize.width * totalScale;
      const renderedHeight = naturalSize.height * totalScale;

      // Top-left of image relative to the CROP_STAGE_SIZE viewport
      const imgLeftInStage = (CROP_STAGE_SIZE - renderedWidth) / 2 + offset.x;
      const imgTopInStage = (CROP_STAGE_SIZE - renderedHeight) / 2 + offset.y;

      const outputFactor = OUTPUT_SIZE / CROP_STAGE_SIZE;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        imgRef.current,
        imgLeftInStage * outputFactor,
        imgTopInStage * outputFactor,
        renderedWidth * outputFactor,
        renderedHeight * outputFactor
      );

      const targetMime =
        file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error('Unable to generate cropped image.'));
          },
          targetMime,
          0.92
        );
      });

      await onConfirm(blob, file.name);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Unable to save profile picture. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const fileSizeLabel = file
    ? file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`
    : '';

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Preview & Crop Profile Picture"
      description="Drag to reposition and use the slider to adjust circular framing before saving."
      size="md"
    >
      <div className="space-y-5">
        {loadError && <AlertBanner variant="error" message={loadError} />}
        {saveError && <AlertBanner variant="error" message={saveError} />}

        {imageUrl && !loadError && (
          <div className="flex flex-col items-center gap-4">
            {/* Interactive Circular Crop Viewport */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ width: CROP_STAGE_SIZE, height: CROP_STAGE_SIZE }}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900 touch-none select-none cursor-grab active:cursor-grabbing"
              aria-label="Circular crop preview area. Drag to adjust position."
            >
              {naturalSize && (
                <img
                  src={imageUrl}
                  alt="Selected profile preview"
                  draggable={false}
                  style={{
                    width: naturalSize.width * totalScale,
                    height: naturalSize.height * totalScale,
                    left: (CROP_STAGE_SIZE - naturalSize.width * totalScale) / 2 + offset.x,
                    top: (CROP_STAGE_SIZE - naturalSize.height * totalScale) / 2 + offset.y,
                  }}
                  className="absolute max-w-none pointer-events-none select-none"
                />
              )}

              {/* Circular Frame Overlay */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none rounded-full ring-2 ring-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Move className="h-3.5 w-3.5 text-slate-400" />
              <span>Drag image to center your face inside the circle</span>
            </div>

            {/* Zoom & Reset Controls */}
            <div className="w-full max-w-xs space-y-2">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, Number((z - 0.15).toFixed(2))))}
                  disabled={zoom <= 1 || saving}
                  aria-label="Zoom out"
                  className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  disabled={saving}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  aria-label="Zoom level"
                  className="flex-1 accent-teal-600 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))))}
                  disabled={zoom >= 3 || saving}
                  aria-label="Zoom in"
                  className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetCrop}
                  disabled={saving}
                  aria-label="Reset crop position"
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected File Metadata */}
        {file && (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-slate-800 truncate max-w-[240px]">{file.name}</span>
            <span className="font-mono-num text-slate-500">
              {fileSizeLabel}
              {naturalSize ? ` · ${naturalSize.width}×${naturalSize.height}px` : ''}
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmSave}
            disabled={Boolean(loadError) || !naturalSize || saving}
            loading={saving}
          >
            {saving ? 'Saving Picture...' : 'Save Profile Picture'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
