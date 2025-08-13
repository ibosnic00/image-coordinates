"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Trash2, Edit3, ZoomIn, ZoomOut, RotateCcw, Crop } from "lucide-react";

interface Rectangle {
  id: string;
  x: number; // percentage 0-1
  y: number; // percentage 0-1
  width: number; // percentage 0-1
  height: number; // percentage 0-1
  isEditing: boolean;
}

const PRESET_SIZES = [
  { label: "480 x 480", width: 480, height: 480 },
  { label: "640 x 640", width: 640, height: 640 },
  { label: "800 x 600", width: 800, height: 600 },
  { label: "1024 x 768", width: 1024, height: 768 },
];

export default function ImageEditor() {
  const [image, setImage] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState({
    width: 0,
    height: 0,
  });
  const [targetSize, setTargetSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<Rectangle | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredRect, setHoveredRect] = useState<string | null>(null);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [editingRect, setEditingRect] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [cropPosition, setCropPosition] = useState({ x: 0.25, y: 0.25 }); // Center crop by default
  const [isPositioningCrop, setIsPositioningCrop] = useState(false);
  const [pendingResize, setPendingResize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [hasClickedOnce, setHasClickedOnce] = useState(false);
  const [cropZoom, setCropZoom] = useState(1); // separate zoom for crop positioning
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 }); // separate pan for crop positioning
  const [cropSize, setCropSize] = useState({ width: 0.5, height: 0.5 }); // percentage of image
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [cropResizeHandle, setCropResizeHandle] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle Ctrl key state
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Control" || event.key === "Meta") {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Control" || event.key === "Meta") {
        setIsCtrlPressed(false);
        if (isDragging) {
          setIsDragging(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isDragging]);

  // Handle wheel events with conditional prevention
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const handleWheel = (e: WheelEvent) => {
        if (isCtrlPressed) {
          e.preventDefault();
        }
      };
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        container.removeEventListener("wheel", handleWheel);
      };
    }
  }, [isCtrlPressed]);

  const handleImageLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.error("No file selected");
      return;
    }

    const img = new Image();
    img.onload = () => {
      setOriginalImageSize({ width: img.width, height: img.height });
      setRectangles([]);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setTargetSize(null);
      setHasClickedOnce(false);
      setIsPositioningCrop(false);
      setCropPosition({ x: 0.25, y: 0.25 });
      setCropZoom(1);
      setCropPan({ x: 0, y: 0 });
      setCropSize({ width: 0.5, height: 0.5 });
      setIsDraggingCrop(false);
      setCropResizeHandle(null);
    };

    img.onerror = () => {
      console.error("Failed to load image");
    };

    try {
      const imageUrl = URL.createObjectURL(file);
      img.src = imageUrl;
      setImage(imageUrl);
    } catch (error) {
      console.error("Failed to create object URL:", error);
    }
  };

  const handleResizeClick = () => {
    if (!image) return;
    setIsPositioningCrop(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCropSize({ width: 0.5, height: 0.4 });
    setCropPosition({ x: 0.25, y: 0.3 });
  };

  const handleConfirmCrop = () => {
    if (!pendingResize || !image) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = pendingResize.width;
      canvas.height = pendingResize.height;

      const sourceX = cropPosition.x * originalImageSize.width;
      const sourceY = cropPosition.y * originalImageSize.height;
      const sourceWidth = cropSize.width * originalImageSize.width;
      const sourceHeight = cropSize.height * originalImageSize.height;

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        pendingResize.width,
        pendingResize.height
      );

      const croppedImageUrl = canvas.toDataURL();
      setImage(croppedImageUrl);
      setOriginalImageSize({
        width: pendingResize.width,
        height: pendingResize.height,
      });
      setRectangles([]);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsPositioningCrop(false);
      setPendingResize(null);
      setHasClickedOnce(false);
      setIsDraggingCrop(false);
      setCropResizeHandle(null);
    };
    img.onerror = () => {
      console.error("Failed to load image for cropping");
    };
    img.crossOrigin = "anonymous";
    img.src = image;
  };

  const handleCancelCrop = () => {
    setIsPositioningCrop(false);
    setPendingResize(null);
    setIsDraggingCrop(false);
    setCropResizeHandle(null);
  };

  const getImageCoordinates = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return { x: 0, y: 0 };

    const imageRect = imageRef.current.getBoundingClientRect();
    const clickX = event.clientX - imageRect.left;
    const clickY = event.clientY - imageRect.top;

    // Convert to percentage coordinates (0-1) on the image
    const x = clickX / imageRect.width;
    const y = clickY / imageRect.height;

    // Clamp to 0-1 range
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  };

  const getResizeHandle = (
    rect: Rectangle,
    point: { x: number; y: number }
  ): string | null => {
    const tolerance = 0.02; // 2% tolerance for handle detection

    const handles = [
      { x: rect.x, y: rect.y, handle: "nw" },
      { x: rect.x + rect.width, y: rect.y, handle: "ne" },
      { x: rect.x, y: rect.y + rect.height, handle: "sw" },
      { x: rect.x + rect.width, y: rect.y + rect.height, handle: "se" },
    ];

    for (const handle of handles) {
      if (
        Math.abs(point.x - handle.x) <= tolerance &&
        Math.abs(point.y - handle.y) <= tolerance
      ) {
        return handle.handle;
      }
    }

    return null;
  };

  const getCropResizeHandle = (point: {
    x: number;
    y: number;
  }): string | null => {
    const tolerance = 0.02; // 2% tolerance for handle detection

    const handles = [
      { x: cropPosition.x, y: cropPosition.y, handle: "nw" },
      { x: cropPosition.x + cropSize.width, y: cropPosition.y, handle: "ne" },
      { x: cropPosition.x, y: cropPosition.y + cropSize.height, handle: "sw" },
      {
        x: cropPosition.x + cropSize.width,
        y: cropPosition.y + cropSize.height,
        handle: "se",
      },
    ];

    for (const handle of handles) {
      if (
        Math.abs(point.x - handle.x) <= tolerance &&
        Math.abs(point.y - handle.y) <= tolerance
      ) {
        return handle.handle;
      }
    }

    return null;
  };

  const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!image || isCtrlPressed) return;

    const coords = getImageCoordinates(event);

    if (isPositioningCrop && pendingResize) {
      // Don't handle any clicks during crop positioning - let mouse down handle it
      return;
    }

    if (isPositioningCrop) return;

    // Check if clicking on a resize handle of an editing rectangle
    const editingRectangle = rectangles.find((r) => r.isEditing);
    if (editingRectangle) {
      const handle = getResizeHandle(editingRectangle, coords);
      if (handle) {
        setResizeHandle(handle);
        setDragStart(coords);
        return;
      }
    }

    if (isDrawing && currentRect) {
      // Second click - finish the rectangle
      const width = coords.x - drawStart.x;
      const height = coords.y - drawStart.y;

      const finalRect = {
        ...currentRect,
        x: Math.min(drawStart.x, coords.x),
        y: Math.min(drawStart.y, coords.y),
        width: Math.abs(width),
        height: Math.abs(height),
      };

      // Only add rectangle if it has some size
      if (finalRect.width > 0.01 && finalRect.height > 0.01) {
        setRectangles((prev) => [...prev, finalRect]);
      }

      // Reset drawing state
      setIsDrawing(false);
      setCurrentRect(null);
    } else if (!isDrawing && !currentRect) {
      // First click - start drawing
      setIsDrawing(true);
      setDrawStart(coords);
      setCurrentRect({
        id: Date.now().toString(),
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        isEditing: false,
      });
    }
  };

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (isDraggingCrop) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (isDragging && isCtrlPressed) {
        setPan({
          x: event.clientX - dragStart.x,
          y: event.clientY - dragStart.y,
        });
        return;
      }

      if (!imageRef.current) return;
      const coords = getImageCoordinates(
        event as React.MouseEvent<HTMLImageElement>
      );

      if (isDraggingCrop && cropResizeHandle) {
        const newCropSize = { ...cropSize };
        const newCropPosition = { ...cropPosition };

        switch (cropResizeHandle) {
          case "nw":
            newCropSize.width = cropPosition.x + cropSize.width - coords.x;
            newCropSize.height = cropPosition.y + cropSize.height - coords.y;
            newCropPosition.x = coords.x;
            newCropPosition.y = coords.y;
            break;
          case "ne":
            newCropSize.width = coords.x - cropPosition.x;
            newCropSize.height = cropPosition.y + cropSize.height - coords.y;
            newCropPosition.y = coords.y;
            break;
          case "sw":
            newCropSize.width = cropPosition.x + cropSize.width - coords.x;
            newCropSize.height = coords.y - cropPosition.y;
            newCropPosition.x = coords.x;
            break;
          case "se":
            newCropSize.width = coords.x - cropPosition.x;
            newCropSize.height = coords.y - cropPosition.y;
            break;
        }

        // Ensure minimum size and bounds
        newCropSize.width = Math.max(
          0.05,
          Math.min(1 - newCropPosition.x, newCropSize.width)
        );
        newCropSize.height = Math.max(
          0.05,
          Math.min(1 - newCropPosition.y, newCropSize.height)
        );
        newCropPosition.x = Math.max(
          0,
          Math.min(1 - newCropSize.width, newCropPosition.x)
        );
        newCropPosition.y = Math.max(
          0,
          Math.min(1 - newCropSize.height, newCropPosition.y)
        );

        setCropSize(newCropSize);
        setCropPosition(newCropPosition);
        return;
      }

      if (isDraggingCrop && !cropResizeHandle && isPositioningCrop) {
        const newX = coords.x - dragStart.x;
        const newY = coords.y - dragStart.y;

        setCropPosition({
          x: Math.max(0, Math.min(1 - cropSize.width, newX)),
          y: Math.max(0, Math.min(1 - cropSize.height, newY)),
        });
        return;
      }

      // Handle resize dragging
      if (resizeHandle && editingRect) {
        const rect = rectangles.find((r) => r.id === editingRect);
        if (rect) {
          const deltaX = coords.x - dragStart.x;
          const deltaY = coords.y - dragStart.y;

          setRectangles((prev) =>
            prev.map((r) => {
              if (r.id === editingRect) {
                const newRect = { ...r };

                switch (resizeHandle) {
                  case "nw":
                    newRect.x += deltaX;
                    newRect.y += deltaY;
                    newRect.width -= deltaX;
                    newRect.height -= deltaY;
                    break;
                  case "ne":
                    newRect.y += deltaY;
                    newRect.width += deltaX;
                    newRect.height -= deltaY;
                    break;
                  case "sw":
                    newRect.x += deltaX;
                    newRect.width -= deltaX;
                    newRect.height += deltaY;
                    break;
                  case "se":
                    newRect.width += deltaX;
                    newRect.height += deltaY;
                    break;
                }

                newRect.width = Math.max(
                  0.01,
                  Math.min(1 - newRect.x, newRect.width)
                );
                newRect.height = Math.max(
                  0.01,
                  Math.min(1 - newRect.y, newRect.height)
                );
                newRect.x = Math.max(0, Math.min(1 - newRect.width, newRect.x));
                newRect.y = Math.max(
                  0,
                  Math.min(1 - newRect.height, newRect.y)
                );

                return newRect;
              }
              return r;
            })
          );

          setDragStart(coords);
        }
        return;
      }

      // Handle rectangle drawing
      if (isDrawing && currentRect) {
        const width = coords.x - drawStart.x;
        const height = coords.y - drawStart.y;

        setCurrentRect({
          ...currentRect,
          x: Math.min(drawStart.x, coords.x),
          y: Math.min(drawStart.y, coords.y),
          width: Math.abs(width),
          height: Math.abs(height),
        });
      }
    },
    [
      isDragging,
      isCtrlPressed,
      dragStart,
      resizeHandle,
      editingRect,
      rectangles,
      isDrawing,
      currentRect,
      drawStart,
      isPositioningCrop,
      pendingResize,
      originalImageSize,
      isDraggingCrop,
      cropResizeHandle,
      cropSize,
      cropPosition,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (isDraggingCrop) {
      setIsDraggingCrop(false);
      setCropResizeHandle(null);
      return;
    }

    if (resizeHandle) {
      setResizeHandle(null);
      return;
    }
  }, [isDragging, resizeHandle, isDraggingCrop]);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (!isCtrlPressed) return;

      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;

      if (isPositioningCrop) {
        const newZoom = Math.max(0.1, Math.min(5, cropZoom * delta));

        // Calculate zoom center point
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = event.clientX - rect.left;
        const centerY = event.clientY - rect.top;

        // Adjust pan to keep zoom centered on mouse position
        const zoomRatio = newZoom / cropZoom;
        setCropPan((prev) => ({
          x: centerX - (centerX - prev.x) * zoomRatio,
          y: centerY - (centerY - prev.y) * zoomRatio,
        }));

        setCropZoom(newZoom);
      } else {
        const newZoom = Math.max(0.1, Math.min(5, zoom * delta));

        // Calculate zoom center point
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = event.clientX - rect.left;
        const centerY = event.clientY - rect.top;

        // Adjust pan to keep zoom centered on mouse position
        const zoomRatio = newZoom / zoom;
        setPan((prev) => ({
          x: centerX - (centerX - prev.x) * zoomRatio,
          y: centerY - (centerY - prev.y) * zoomRatio,
        }));

        setZoom(newZoom);
      }
    },
    [zoom, cropZoom, isCtrlPressed, isPositioningCrop]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLImageElement>) => {
      if (isPositioningCrop) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (isCtrlPressed) {
        setIsDragging(true);
        setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
        return;
      }

      const coords = getImageCoordinates(event);
      if (!coords) return;

      if (isPositioningCrop) {
        const handle = getCropResizeHandle(coords);
        if (handle) {
          setCropResizeHandle(handle);
          setDragStart(coords);
          setIsDraggingCrop(true);
          return;
        }

        // Check if clicking inside crop area to move it
        if (
          coords.x >= cropPosition.x &&
          coords.x <= cropPosition.x + cropSize.width &&
          coords.y >= cropPosition.y &&
          coords.y <= cropPosition.y + cropSize.height
        ) {
          setDragStart({
            x: coords.x - cropPosition.x,
            y: coords.y - cropPosition.y,
          });
          setIsDraggingCrop(true);
          return;
        }

        // Click outside crop area - center it at click position
        const newX = coords.x - cropSize.width / 2;
        const newY = coords.y - cropSize.height / 2;
        setCropPosition({
          x: Math.max(0, Math.min(1 - cropSize.width, newX)),
          y: Math.max(0, Math.min(1 - cropSize.height, newY)),
        });
        return;
      }

      // Handle rectangle editing
      if (editingRect) {
        // ... existing editing code ...
        return;
      }

      // Check if clicking on resize handles
      for (const rect of rectangles) {
        const handle = getResizeHandle(rect, coords);
        if (handle) {
          setResizeHandle(handle);
          setDragStart(coords);
          return;
        }
      }
      // If not clicking on a handle, don't start drawing
      return;
    },
    [
      isCtrlPressed,
      isPositioningCrop,
      pendingResize,
      cropPosition,
      cropSize,
      cropPan,
      pan,
      rectangles,
    ]
  );

  const deleteRectangle = (id: string) => {
    setRectangles((prev) => prev.filter((rect) => rect.id !== id));
    if (editingRect === id) {
      setEditingRect(null);
    }
  };

  const toggleEditRectangle = (id: string) => {
    setRectangles((prev) =>
      prev.map((rect) => ({
        ...rect,
        isEditing: rect.id === id ? !rect.isEditing : false,
      }))
    );
    setEditingRect((prev) => (prev === id ? null : id));
  };

  const handleZoomIn = () => {
    if (isPositioningCrop) {
      setCropZoom((prev) => Math.min(prev * 1.2, 5));
    } else {
      setZoom((prev) => Math.min(prev * 1.2, 5));
    }
  };

  const handleZoomOut = () => {
    if (isPositioningCrop) {
      setCropZoom((prev) => Math.max(prev / 1.2, 0.1));
    } else {
      setZoom((prev) => Math.max(prev / 1.2, 0.1));
    }
  };

  const handleResetZoom = () => {
    if (isPositioningCrop) {
      setCropZoom(1);
      setCropPan({ x: 0, y: 0 });
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [cropArea, setCropArea] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (image && imageRef.current) {
      const img = imageRef.current;
      const naturalWidth = originalImageSize.width;
      const naturalHeight = originalImageSize.height;

      // Calculate the container's aspect ratio
      const containerWidth = containerRef.current?.offsetWidth || 0;
      const containerHeight = containerRef.current?.offsetHeight || 0;
      const containerAspectRatio = containerWidth / containerHeight;

      // Calculate the image's aspect ratio
      const imageAspectRatio = naturalWidth / naturalHeight;

      let newWidth, newHeight;

      if (imageAspectRatio > containerAspectRatio) {
        // Image is wider than the container, so fit to container width
        newWidth = containerWidth;
        newHeight = containerWidth / imageAspectRatio;
      } else {
        // Image is taller than the container, so fit to container height
        newHeight = containerHeight;
        newWidth = containerHeight * imageAspectRatio;
      }

      setImageSize({ width: newWidth, height: newHeight });
    }
  }, [image, originalImageSize]);

  useEffect(() => {
    setPanX(pan.x);
    setPanY(pan.y);
  }, [pan]);

  const cropAreaCalculation = () => {
    if (isPositioningCrop) {
      return {
        x: cropPosition.x,
        y: cropPosition.y,
        width: cropSize.width,
        height: cropSize.height,
      };
    } else {
      return null;
    }
  };

  useEffect(() => {
    setCropArea(cropAreaCalculation());
  }, [isPositioningCrop, cropPosition, cropSize]);

  const handleCornerMouseDown = (
    e: React.MouseEvent,
    rectId: string,
    corner: string
  ) => {
    e.stopPropagation(); // Prevent image click when interacting with corners
    setResizeHandle(corner);
    setEditingRect(rectId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const confirmCrop = useCallback(() => {
    if (!image || !imageRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sourceX = cropPosition.x * originalImageSize.width;
    const sourceY = cropPosition.y * originalImageSize.height;
    const sourceWidth = cropSize.width * originalImageSize.width;
    const sourceHeight = cropSize.height * originalImageSize.height;

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          sourceWidth,
          sourceHeight
        );
        const croppedDataUrl = canvas.toDataURL("image/png");

        // Update the main image with cropped version
        setImage(croppedDataUrl);
        setOriginalImageSize({ width: sourceWidth, height: sourceHeight });

        // Reset crop state
        setIsPositioningCrop(false);
        setPendingResize(null);
        setCropPosition({ x: 0, y: 0 });
        setCropSize({ width: 0.5, height: 0.5 });
        setZoom(1);
        setPan({ x: 0, y: 0 });

        console.log("Crop completed successfully");
      } catch (error) {
        console.error("Error during crop operation:", error);
      }
    };

    img.onerror = (error) => {
      console.error("Error loading image for crop:", error);
    };

    img.src = image;
  }, [image, cropPosition, cropSize, originalImageSize]);

  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #27272a;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #52525b;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #71717a;
        }
      `}</style>
      <div className="min-h-screen bg-black text-zinc-200">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6 border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-semibold text-white mb-1">
            Coordinate Extractor
          </h1>
          <p className="text-zinc-400 text-sm">
            Extract coordinates for multiple selected rectangles from images
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Image Area */}
          <div className="lg:col-span-3">
            <div className="editor-card rounded-lg">
              {/* Toolbar */}
              <div className="border-b border-zinc-700 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="editor-button px-4 py-2 rounded-md font-medium"
                  >
                    Load Image
                  </button>

                  {image && (
                    <>
                      <button
                        onClick={handleResizeClick}
                        className="editor-button px-4 py-2 rounded-md font-medium flex items-center gap-2"
                      >
                        <Crop className="w-4 h-4" />
                        Resize
                      </button>

                      {isPositioningCrop && (
                        <div className="flex items-center gap-3 bg-zinc-800 px-4 py-2 rounded-md border border-zinc-600">
                          <span className="text-sm text-zinc-300">
                            Position crop area
                          </span>
                          <button
                            onClick={confirmCrop}
                            className="editor-button active px-3 py-1 rounded text-sm"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={handleCancelCrop}
                            className="editor-button px-3 py-1 rounded text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-md border border-zinc-600">
                        <button
                          onClick={handleZoomOut}
                          className="editor-button p-1 rounded"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-mono text-zinc-300 min-w-[50px] text-center">
                          {Math.round(
                            (isPositioningCrop ? cropZoom : zoom) * 100
                          )}
                          %
                        </span>
                        <button
                          onClick={handleZoomIn}
                          className="editor-button p-1 rounded"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleResetZoom}
                          className="editor-button p-1 rounded"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>

                      <div
                        className={`text-xs px-3 py-2 rounded-md transition-all ${
                          isCtrlPressed
                            ? "bg-orange-600/20 text-orange-300 border border-orange-500/30"
                            : "text-zinc-500 bg-zinc-800/50"
                        }`}
                      >
                        {isCtrlPressed
                          ? "Navigation Mode"
                          : "Ctrl + Scroll/Drag to Navigate"}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Canvas Area */}
              <div className="p-4">
                <div
                  ref={containerRef}
                  className="border border-zinc-700 rounded-lg overflow-hidden relative bg-zinc-900"
                  style={{
                    height: "600px",
                    cursor: isDragging
                      ? "grabbing"
                      : isCtrlPressed
                      ? "grab"
                      : isPositioningCrop
                      ? "crosshair"
                      : "crosshair",
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  onClick={handleImageClick}
                >
                  {!image ? (
                    <div className="flex items-center justify-center h-full text-zinc-500">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-zinc-800 flex items-center justify-center">
                          <Crop className="w-8 h-8" />
                        </div>
                        <p className="font-medium">No image loaded</p>
                        <p className="text-sm mt-1">
                          Click "Load Image" to get started
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${
                          isPositioningCrop ? cropZoom : zoom
                        })`,
                        transformOrigin: "0 0",
                        transition: isDragging
                          ? "none"
                          : "transform 0.1s ease-out",
                      }}
                    >
                      <img
                        ref={imageRef}
                        src={image || "/placeholder.svg"}
                        alt="Loaded"
                        style={{
                          display: "block",
                          maxWidth: "none",
                          maxHeight: "none",
                          width: `${imageSize.width}px`,
                          height: `${imageSize.height}px`,
                        }}
                        draggable={false}
                      />

                      {/* Crop Overlay */}
                      {isPositioningCrop && cropArea && (
                        <>
                          <div
                            style={{
                              position: "absolute",
                              left: `${cropArea.x * imageSize.width}px`,
                              top: `${cropArea.y * imageSize.height}px`,
                              width: `${cropArea.width * imageSize.width}px`,
                              height: `${cropArea.height * imageSize.height}px`,
                              border: "2px solid #ff6b35",
                              backgroundColor: "rgba(255, 107, 53, 0.1)",
                              cursor: "move",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              left: `${cropArea.x * imageSize.width}px`,
                              top: `${cropArea.y * imageSize.height - 25}px`,
                              color: "#ff6b35",
                              fontSize: "14px",
                              fontWeight: "600",
                              fontFamily: "var(--font-mono)",
                              backgroundColor: "rgba(0, 0, 0, 0.8)",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              pointerEvents: "none",
                            }}
                          >
                            Crop:{" "}
                            {Math.round(
                              cropArea.width * originalImageSize.width
                            )}{" "}
                            ×{" "}
                            {Math.round(
                              cropArea.height * originalImageSize.height
                            )}
                          </div>

                          {/* Crop resize handles */}
                          {[
                            {
                              handle: "nw",
                              x: cropArea.x,
                              y: cropArea.y,
                              cursor: "nw-resize",
                            },
                            {
                              handle: "ne",
                              x: cropArea.x + cropArea.width,
                              y: cropArea.y,
                              cursor: "ne-resize",
                            },
                            {
                              handle: "sw",
                              x: cropArea.x,
                              y: cropArea.y + cropArea.height,
                              cursor: "sw-resize",
                            },
                            {
                              handle: "se",
                              x: cropArea.x + cropArea.width,
                              y: cropArea.y + cropArea.height,
                              cursor: "se-resize",
                            },
                          ].map(({ handle, x, y, cursor }) => (
                            <div
                              key={handle}
                              style={{
                                position: "absolute",
                                left: `${x * imageSize.width - 6}px`,
                                top: `${y * imageSize.height - 6}px`,
                                width: "12px",
                                height: "12px",
                                backgroundColor: "#f97316",
                                border: "2px solid white",
                                borderRadius: "2px",
                                cursor,
                                zIndex: 1000,
                              }}
                            />
                          ))}
                        </>
                      )}

                                             {/* Rectangle Overlays */}
                       {!isPositioningCrop &&
                         rectangles.map((rect) => (
                           <div key={rect.id}>
                             <div
                               style={{
                                 position: "absolute",
                                 left: `${rect.x * imageSize.width}px`,
                                 top: `${rect.y * imageSize.height}px`,
                                 width: `${rect.width * imageSize.width}px`,
                                 height: `${rect.height * imageSize.height}px`,
                                 border: `${
                                   rect.isEditing
                                     ? "3px solid #10b981"
                                     : hoveredRect === rect.id
                                     ? "4px solid #06b6d4"
                                     : "2px solid #dc2626"
                                 }`,
                                 backgroundColor: `${
                                   rect.isEditing
                                     ? "rgba(16, 185, 129, 0.1)"
                                     : hoveredRect === rect.id
                                     ? "rgba(6, 182, 212, 0.15)"
                                     : "rgba(220, 38, 38, 0.05)"
                                 }`,
                                 pointerEvents: rect.isEditing ? "auto" : "none",
                               }}
                             >
                              {rect.isEditing && (
                                <>
                                  {/* Corner handles */}
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "-4px",
                                      left: "-4px",
                                      width: "8px",
                                      height: "8px",
                                      backgroundColor: "#10b981",
                                      cursor: "nw-resize",
                                    }}
                                    onMouseDown={(e) =>
                                      handleCornerMouseDown(e, rect.id, "nw")
                                    }
                                  />
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "-4px",
                                      right: "-4px",
                                      width: "8px",
                                      height: "8px",
                                      backgroundColor: "#10b981",
                                      cursor: "ne-resize",
                                    }}
                                    onMouseDown={(e) =>
                                      handleCornerMouseDown(e, rect.id, "ne")
                                    }
                                  />
                                  <div
                                    style={{
                                      position: "absolute",
                                      bottom: "-4px",
                                      left: "-4px",
                                      width: "8px",
                                      height: "8px",
                                      backgroundColor: "#10b981",
                                      cursor: "sw-resize",
                                    }}
                                    onMouseDown={(e) =>
                                      handleCornerMouseDown(e, rect.id, "sw")
                                    }
                                  />
                                  <div
                                    style={{
                                      position: "absolute",
                                      bottom: "-4px",
                                      right: "-4px",
                                      width: "8px",
                                      height: "8px",
                                      backgroundColor: "#10b981",
                                      cursor: "se-resize",
                                    }}
                                    onMouseDown={(e) =>
                                      handleCornerMouseDown(e, rect.id, "se")
                                    }
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        ))}

                      {/* Current Drawing Rectangle */}
                      {currentRect && (
                        <div
                          style={{
                            position: "absolute",
                            left: `${currentRect.x * imageSize.width}px`,
                            top: `${currentRect.y * imageSize.height}px`,
                            width: `${currentRect.width * imageSize.width}px`,
                            height: `${
                              currentRect.height * imageSize.height
                            }px`,
                            border: "2px dashed #06b6d4",
                            backgroundColor: "rgba(6, 182, 212, 0.1)",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rectangle List */}
          <div className="lg:col-span-1">
            <div className="editor-card rounded-lg">
              <div className="border-b border-zinc-700 p-4">
                <h2 className="text-lg font-semibold text-white">
                  Selections ({rectangles.length})
                </h2>
              </div>
              <div className="p-4">
                                                                   <div 
                                    className="space-y-3 max-h-156 overflow-y-auto custom-scrollbar"
                                    style={{
                                      scrollbarWidth: 'thin',
                                      scrollbarColor: '#52525b #27272a'
                                    }}
                                  >
                  {rectangles.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <Edit3 className="w-6 h-6 text-zinc-500" />
                      </div>
                      <p className="text-zinc-400 text-sm">No selections</p>
                      <p className="text-zinc-600 text-xs mt-1">
                        Draw rectangles on the image
                      </p>
                    </div>
                  ) : (
                    rectangles.map((rect, index) => (
                      <div
                        key={rect.id}
                        className={`p-3 border rounded-lg transition-all cursor-pointer ${
                          hoveredRect === rect.id
                            ? "bg-zinc-800 border-orange-500/50"
                            : "bg-zinc-800/50 border-zinc-600"
                        } ${
                          rect.isEditing
                            ? "ring-1 ring-emerald-500 bg-emerald-900/10"
                            : ""
                        }`}
                        onMouseEnter={() => setHoveredRect(rect.id)}
                        onMouseLeave={() => setHoveredRect(null)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">
                            #{index + 1}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => toggleEditRectangle(rect.id)}
                              className={`p-1 rounded text-xs ${
                                rect.isEditing
                                  ? "bg-emerald-600 text-white"
                                  : "editor-button"
                              }`}
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteRectangle(rect.id)}
                              className="editor-button p-1 rounded text-xs hover:bg-red-600 hover:border-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs text-zinc-400 space-y-1 font-mono">
                          <div className="bg-zinc-900 p-2 rounded">
                            <div className="text-zinc-300 mb-1">
                              Coordinates:
                            </div>
                            <div>
                              TL: (
                              {Math.round(rect.x * originalImageSize.width)},{" "}
                              {Math.round(rect.y * originalImageSize.height)})
                            </div>
                            <div>
                              BR: (
                              {Math.round(
                                (rect.x + rect.width) * originalImageSize.width
                              )}
                              ,{" "}
                              {Math.round(
                                (rect.y + rect.height) *
                                  originalImageSize.height
                              )}
                              )
                            </div>
                            <div className="text-orange-400 mt-1">
                              {Math.round(rect.width * originalImageSize.width)}{" "}
                              ×{" "}
                              {Math.round(
                                rect.height * originalImageSize.height
                              )}
                            </div>
                          </div>
                          {rect.isEditing && (
                            <div className="text-emerald-400 text-center py-1 bg-emerald-900/20 rounded text-xs">
                              Editing - drag corners
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageLoad}
        className="hidden"
      />
    </div>
    </>
  );
}
