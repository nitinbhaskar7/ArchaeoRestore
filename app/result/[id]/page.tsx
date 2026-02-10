'use client';

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

const Page = () => {
  const { id } = useParams();
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [data, setData] = useState<any>(null);
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      const res = await axios.post('/api/fetch-result', { id });
      console.log(res.data);
      setData(res.data[0]);
      setLoading(false);
    };
    fetchResult();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-[80vh] w-full" />
      </div>
    );
  }

  const {
    image,
    before_char,
    predicted_char,
    after_char,
    x1,
    y1,
    x2,
    y2,
    created_at
  } = data;

  const box = x1 && y1 && x2 && y2 && {
    left: x1 * imgSize.w,
    top: y1 * imgSize.h,
    width: (x2 - x1) * imgSize.w,
    height: (y2 - y1) * imgSize.h
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col md:flex-row">

      {/* LEFT PANEL */}
      <div className="w-full md:w-2/5 border-b md:border-r p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Extracted Text</h2>
          <p className="text-sm text-muted-foreground">
            OCR result for selected region
          </p>
        </div>

        <div className="rounded-lg border p-4 bg-muted/40">
          <div className="text-lg leading-relaxed whitespace-pre-wrap">
            <div>
              {(data.before_char || data.predicted_char || data.after_char) && (
                <div
                  className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900"
                >
                  {data.before_char}
                  <span className="font-bold px-1 rounded bg-yellow-200 dark:bg-yellow-600">
                    {data.predicted_char}
                  </span>
                  {data.predicted_char}
                  {data.after_char}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Created: {created_at ? new Date(created_at).toLocaleString() : '—'}
            </p>
          </div>
        </div>


      </div>

      {/* RIGHT PANEL */}
      <div className="w-full md:w-3/5 p-4 flex justify-center items-start">
        <div className="relative">
          <img
            ref={imgRef}
            src={image}
            alt="OCR Source"
            className="max-h-[85vh] w-auto rounded-lg shadow"
            onLoad={(e) => {
              setImgSize({
                w: e.currentTarget.clientWidth,
                h: e.currentTarget.clientHeight
              });
            }}
          />

          {/* Bounding Box Overlay */}
          {box && (
            <>
              <div className="absolute inset-0 bg-black/30 pointer-events-none rounded-lg" />
              <div
                className="absolute border-2 border-blue-400 bg-blue-300/20 rounded-md"
                style={box}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;
