import React, { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

export default function ImageCropUpload({ value, onCropped, onClear }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    if (typeof value === "string") {
      // It's a URL
      const url = value.startsWith('http') || value.startsWith('blob:') 
        ? value 
        : `${import.meta.env.VITE_API_BASE_URL || ''}${value.startsWith('/') ? '' : '/'}${value}`;
      setPreviewUrl(url);
    } else if (value instanceof File) {
      // It's a File object
      const objectUrl = URL.createObjectURL(value);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [value]);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const onFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
    e.target.value = null; // Reset so same file can be selected
  };

  const createCroppedImage = async () => {
    const image = new Image();
    image.src = imageSrc;

    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement("canvas");
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    canvas.toBlob((blob) => {
      const croppedFile = new File([blob], "profile.jpg", {
        type: "image/jpeg"
      });
      if (onCropped) onCropped(croppedFile);
      setImageSrc(null); // Exit crop mode
    }, "image/jpeg", 0.8);
  };

  const handleClear = () => {
    setImageSrc(null);
    if (onClear) onClear();
  };

  // 1. Cropping mode
  if (imageSrc) {
    return (
      <div className="space-y-3">
        <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden border border-gray-200">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => setImageSrc(null)}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={createCroppedImage}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors shadow-sm"
          >
            Crop and Save
          </button>
        </div>
      </div>
    );
  }

  // 2. Preview mode
  if (previewUrl) {
    return (
      <div className="relative inline-block group">
        <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm relative bg-white">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full h-full object-cover"
          />
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors z-10"
          title="Remove image"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // 3. Empty input mode
  return (
    <div className="relative group cursor-pointer w-full max-w-sm">
      <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex flex-col items-center justify-center transition-colors group-hover:border-blue-400 group-hover:bg-blue-50/50">
        <ImagePlus className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2" />
        <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">
          Click to upload image
        </span>
        <span className="text-xs text-gray-400 mt-1">1:1 Aspect Ratio Recommended</span>
      </div>
      <input 
        title="Upload Image"
        type="file" 
        accept="image/*" 
        onChange={onFileChange} 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}