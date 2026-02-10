'use client'
import UploadImage from '@/components/custom/UploadImage';
import { FileContextProvider } from '@/components/providers/FileContextProvider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner';
import { motion, AnimatePresence } from "framer-motion";

const Page = () => {

  const [imgURL, setImgURL] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[] | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);

  const [res, setRes] = useState(null);

  const [crop, setCrop] = useState<{
    x1: number,
    y1: number,
    x2: number,
    y2: number
  } | null>(null);

  const [dragMode, setDragMode] = useState<null | 'move' | 'resize'>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number, dy: number } | null>(null);

  useEffect(() => {
    if (files && files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setImgURL(url);

      // RESET extracted text & crop when new image is uploaded
      setRes(null);
      setCrop(null);
    }
  }, [files]);


  const getImageRect = () => imgRef.current?.getBoundingClientRect() ?? null;

  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  // ---------- Start new selection ----------
  const startSelection = (e: React.MouseEvent) => {
    const rect = getImageRect();
    if (!rect) return;

    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const y = clamp(e.clientY - rect.top, 0, rect.height);

    setCrop({ x1: x, y1: y, x2: x, y2: y });
    setDragMode('resize');
  };

  // ---------- Resize selection ----------
  const resizeSelection = (e: React.MouseEvent) => {
    if (!crop || dragMode !== 'resize') return;

    const rect = getImageRect();
    if (!rect) return;

    const mx = clamp(e.clientX - rect.left, 0, rect.width);
    const my = clamp(e.clientY - rect.top, 0, rect.height);

    // Ensure left→right and top→bottom
    setCrop({
      x1: Math.min(crop.x1, mx),
      y1: Math.min(crop.y1, my),
      x2: Math.max(crop.x1, mx),
      y2: Math.max(crop.y1, my)
    });
  };

  // ---------- Start move ----------
  const startMove = (e: React.MouseEvent) => {
    if (!crop) return;
    const rect = getImageRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    setDragMode('move');
    setDragOffset({
      dx: mx - crop.x1,
      dy: my - crop.y1
    });
  };

  // ---------- Move crop ----------
  const moveSelection = (e: React.MouseEvent) => {
    if (!crop || dragMode !== 'move' || !dragOffset) return;

    const rect = getImageRect();
    if (!rect) return;

    const width = crop.x2 - crop.x1;
    const height = crop.y2 - crop.y1;

    let x1 = e.clientX - rect.left - dragOffset.dx;
    let y1 = e.clientY - rect.top - dragOffset.dy;

    x1 = clamp(x1, 0, rect.width - width);
    y1 = clamp(y1, 0, rect.height - height);

    setCrop({
      x1,
      y1,
      x2: x1 + width,
      y2: y1 + height
    });
  };

  const stopDragging = () => setDragMode(null);

  const handlePrint = () => {
    console.log(crop?.x1, crop?.y1, crop?.x2, crop?.y2);
  }

  // ---------- SAVE ----------
  const handleSave = async () => {
    if (!files || !files[0]) return;

    let cropData = null;

    if (crop && imgRef.current) {
      const iw = imgRef.current.width;
      const ih = imgRef.current.height;
      cropData = {
        x1: crop.x1 / iw,
        y1: crop.y1 / ih,
        x2: crop.x2 / iw,
        y2: crop.y2 / ih
      };
    }
    const formData = new FormData();
    formData.append('image', files[0]);
    formData.append('before_char', res ? res.before_char : '');
    formData.append('predicted_char', res ? res.predicted_char : '');
    formData.append('after_char', res ? res.after_char : '');
    formData.append('coords_xy', JSON.stringify(cropData));
    await axios.post('/api/save', formData);
  };

  // ---------- EXTRACT ----------
  const handleExtract = async () => {
    if (!files || !files[0]) return;

    setIsLoading(true);

    let cropData = null;

    if (crop && imgRef.current) {
      const iw = imgRef.current.width;
      const ih = imgRef.current.height;
      console.log('Image dimensions:', iw, ih);

      cropData = {
        x1: crop.x1 / iw,
        y1: crop.y1 / ih,
        x2: crop.x2 / iw,
        y2: crop.y2 / ih
      };
    }
    if (!cropData) {
      toast.error('Please select a character from the image to predict.');
      setIsLoading(false);
      return;
    }
    console.log('Crop data to send:', cropData);

    const formData = new FormData();
    formData.append('image', files[0]);
    // send crop data as [x1, y1, x2, y2] convert cropData to array
    formData.append('crop', JSON.stringify(cropData));


    try {
      const res = await axios.post('http://127.0.0.1:8000/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('OCR Response:', res.data);
      // find predicted character for highlighting
      setRes(res.data);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FileContextProvider value={{ files, setFiles }}>
      <div className="relative w-full min-h-screen flex flex-col md:flex-row">

        {/* LEFT */}
        <div className="w-full md:w-2/5 md:min-h-screen overflow-y-auto border-b md:border-r">
          <div className="flex flex-col gap-6 p-6">
            {/* Instructions Section */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Instructions</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Select the damaged part of the image (drag left→right, top→bottom) and click "Extract Text"
              </p>
            </div>

            {/* Upload Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Upload Image</h3>
              <div className="flex gap-3">
                <UploadImage />
              </div>
            </div>

            {/* Action Section */}
            {/* Action Section */}
            <div className="space-y-4">
              <Button
                onClick={handleExtract}
                disabled={!files || isLoading}
                className="w-full"
              >
                {isLoading ? 'Extracting...' : 'Extract Text'}
              </Button>

              {/* Extracted Text Section */}
              {(isLoading || (res && (res.before_char.length > 0 || res.predicted_char.length > 0 || res.after_char.length > 0))) && (
                <div className="space-y-3 rounded-lg border p-4 bg-slate-50 dark:bg-slate-900">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Extracted Text
                  </h4>

                  {/* Skeleton while loading */}
                  {isLoading && (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[90%]" />
                      <Skeleton className="h-4 w-[75%]" />
                    </div>
                  )}

                  {/* OCR Text */}
                  {!isLoading && (res && (res.before_char.length > 0 || res.predicted_char.length > 0 || res.after_char.length > 0)) && (
                    <AnimatePresence>
                      {(res.before_char || res.predicted_char || res.after_char) && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.8 }}
                          className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900"
                        >
                          <p className="text-lg leading-relaxed">
                            {res.before_char}
                            <motion.span
                              initial={{ backgroundColor: "#facc15" }}
                              animate={{ backgroundColor: "#fde047" }}
                              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                              className="font-bold px-1 rounded"
                            >
                              {res.predicted_char}
                            </motion.span>
                            {res.after_char}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  )}

                  {/* Save Button */}
                  {!isLoading && (res && (res.before_char.length > 0 || res.predicted_char.length > 0 || res.after_char.length > 0)) && (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleSave}
                    >
                      Save Results
                    </Button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT */}
        <div className="w-full md:w-3/5 p-4 overflow-y-auto md:min-h-screen">
          <div className="relative">
            
            {imgURL && (
              <>
               <h3 className="font-semibold text-sm mb-2">Input Image</h3>
              <div
                className="relative cursor-crosshair"
                onMouseDown={startSelection}
                onMouseMove={(e) => {
                  resizeSelection(e);
                  moveSelection(e);
                }}
                onMouseUp={stopDragging}
              >
               

                <img
                  ref={imgRef}
                  src={imgURL}
                  alt="Uploaded"
                  className="w-full h-auto max-h-[85vh]  "

                />

                {crop && (
                  <>
                    {/* <div className="absolute inset-0 bg-black/40 pointer-events-none" /> */}
                    <div
                      className="absolute border-2 border-blue-400 bg-blue-300/20"
                      style={{
                        left: crop.x1,
                        top: crop.y1,
                        width: crop.x2 - crop.x1,
                        height: crop.y2 - crop.y1
                      }}
                      onMouseDown={startMove}
                    >

                    </div>
                  </>
                )}
                {res && (
                  <div className="mt-4 space-y-6">

                    {/* STEP 1 — CROPPED REGION PREVIEW */}


                    {/* STEP 2 — MASKED IMAGE */}
                    <AnimatePresence>
                      {res.masked_image && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                          exit={{ opacity: 0 }}
                        >
                          <h3 className="font-semibold text-sm mb-2">Masked Image</h3>
                          <img
                            src={`data:image/jpeg;base64,${res.masked_image}`}
                            className="rounded-lg shadow"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* STEP 3 — DETECTION IMAGE */}
                    <AnimatePresence>
                      {res.detection_image && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.4 }}
                        >
                          <h3 className="font-semibold text-sm mb-2">Detected Character</h3>
                          <img
                            src={`data:image/jpeg;base64,${res.detection_image}`}
                            className="rounded-lg shadow"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* STEP 4 — CLASSIFICATION RESULTS */}
                    <AnimatePresence>
                      {res.classification_results && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.6 }}
                          className="p-3 bg-slate-900 text-slate-100 rounded-lg text-sm"
                        >
                          <h3 className="font-semibold text-sm mb-2">Classification Raw Output</h3>
                          <pre className="whitespace-pre-wrap text-xs text-left max-h-48 overflow-y-auto">
                            {JSON.stringify(res.classification_results, null, 2)}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* STEP 5 — OCR FINAL RESULT */}

                  </div>
                )}


              </div>
              </>
            )}
          </div>
        </div>
      </div>
    </FileContextProvider>
  );
};

export default Page;
