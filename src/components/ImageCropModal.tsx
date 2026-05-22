import { MouseEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Crop, Minus, Plus, X } from 'lucide-react';
import { createImage, getCroppedImg, PixelCrop } from '../utils/imageCrop';

type ImageCropModalProps = {
  imageSrc: string;
  isOpen: boolean;
  onCancel: () => void;
  onCropComplete: (croppedFile: File, previewUrl: string) => void;
};

type ImageSize = {
  width: number;
  height: number;
};

const aspectRatio = 16 / 9;

export default function ImageCropModal({ imageSrc, isOpen, onCancel, onCropComplete }: ImageCropModalProps) {
  const cropAreaRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; cropX: number; cropY: number } | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setError('');
    createImage(imageSrc)
      .then((image) => setImageSize({ width: image.naturalWidth, height: image.naturalHeight }))
      .catch((err: unknown) => {
        console.error('Image crop load failed', err);
        setError('Unable to load this image.');
      });
  }, [imageSrc, isOpen]);

  const renderedSize = useMemo(() => {
    const cropArea = cropAreaRef.current;
    if (!cropArea || !imageSize) return null;
    const cropWidth = cropArea.clientWidth;
    const cropHeight = cropArea.clientHeight;
    const baseScale = Math.max(cropWidth / imageSize.width, cropHeight / imageSize.height);

    return {
      width: imageSize.width * baseScale * zoom,
      height: imageSize.height * baseScale * zoom,
      cropWidth,
      cropHeight,
    };
  }, [imageSize, zoom]);

  if (!isOpen) return null;

  const clampCrop = (nextCrop: { x: number; y: number }) => {
    const size = renderedSize;
    if (!size) return nextCrop;

    const maxX = Math.max(0, (size.width - size.cropWidth) / 2);
    const maxY = Math.max(0, (size.height - size.cropHeight) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, nextCrop.x)),
      y: Math.min(maxY, Math.max(-maxY, nextCrop.y)),
    };
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      cropX: crop.x,
      cropY: crop.y,
    };
  };

  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;

    const nextCrop = {
      x: dragStartRef.current.cropX + event.clientX - dragStartRef.current.pointerX,
      y: dragStartRef.current.cropY + event.clientY - dragStartRef.current.pointerY,
    };
    setCrop(clampCrop(nextCrop));
  };

  const stopDrag = () => {
    dragStartRef.current = null;
  };

  const applyCrop = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const cropArea = cropAreaRef.current;
    if (!cropArea || !imageSize || !renderedSize) {
      setError('Crop area is not ready yet.');
      return;
    }

    const visibleCrop: PixelCrop = {
      x: Math.max(0, ((renderedSize.width / 2 - renderedSize.cropWidth / 2 - crop.x) / renderedSize.width) * imageSize.width),
      y: Math.max(0, ((renderedSize.height / 2 - renderedSize.cropHeight / 2 - crop.y) / renderedSize.height) * imageSize.height),
      width: Math.min(imageSize.width, (renderedSize.cropWidth / renderedSize.width) * imageSize.width),
      height: Math.min(imageSize.height, (renderedSize.cropHeight / renderedSize.height) * imageSize.height),
    };

    setProcessing(true);
    setError('');
    try {
      const file = await getCroppedImg(imageSrc, visibleCrop, `question-image-${Date.now()}.webp`);
      const previewUrl = URL.createObjectURL(file);
      onCropComplete(file, previewUrl);
    } catch (err) {
      console.error('Image crop generation failed', err);
      setError(err instanceof Error ? err.message : 'Unable to crop this image.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-elios-navy/70 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-elios-navy">Crop question image</h2>
            <p className="text-sm text-slate-500">Drag the image and adjust zoom before applying.</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close crop modal">
            <X size={20} />
          </button>
        </div>

        {error ? <p className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <div className="p-5">
          <div
            ref={cropAreaRef}
            onPointerDown={startDrag}
            onPointerMove={drag}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            className="relative aspect-video w-full cursor-grab overflow-hidden rounded-lg bg-slate-950 active:cursor-grabbing"
            style={{ aspectRatio }}
          >
            {imageSize ? (
              <img
                src={imageSrc}
                alt="Selected question attachment"
                draggable={false}
                className="absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: renderedSize?.width,
                  height: renderedSize?.height,
                  transform: `translate(-50%, -50%) translate(${crop.x}px, ${crop.y}px)`,
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white">Preparing image...</div>
            )}
            <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-elios-yellow" />
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 p-4">
            <label className="flex items-center gap-3 text-sm font-semibold text-elios-navy">
              <Minus size={16} />
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(event) => {
                  setZoom(Number(event.target.value));
                  setCrop((current) => clampCrop(current));
                }}
                className="h-2 flex-1 accent-elios-yellow"
              />
              <Plus size={16} />
              <span className="w-12 text-right">{Math.round(zoom * 100)}%</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-5 py-3 font-bold text-elios-navy hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={applyCrop} disabled={processing || !imageSize} className="inline-flex items-center justify-center gap-2 rounded-lg bg-elios-yellow px-5 py-3 font-bold text-elios-navy disabled:opacity-60">
            <Crop size={18} />
            {processing ? 'Cropping...' : 'Apply crop'}
          </button>
        </div>
      </div>
    </div>
  );
}
