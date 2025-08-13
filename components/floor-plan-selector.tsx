"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  TextField,
} from "@mui/material";
import {
  Place as PlaceIcon,
  Add as AddIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import {
  GetFloorPlan,
  SaveFloorPlan,
  DeleteFloorPlan,
  type FloorPlanData,
  type FloorPlanPin,
} from "../../utils/floorplanUtils";
import { useSettings } from "../../contexts/SettingsContext";

interface FloorPlanSelectorProps {
  organizationId: number;
  resourceId: string | number;
}

const FloorPlanSelector: React.FC<FloorPlanSelectorProps> = ({
  organizationId,
  resourceId,
}) => {
  const { language } = useSettings();
  const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Translations
  const translations = {
    en: {
      title: "Floor Plan",
      loading: "Loading floor plan...",
      noFloorPlan: "No floor plan uploaded",
      uploadFloorPlan: "Upload Floor Plan",
      replaceFloorPlan: "Replace Floor Plan",
      removeFloorPlan: "Remove Floor Plan",
      zoom: "Zoom",
      navigation: "Navigation",
      ctrlActive: "Ctrl Active",
      holdCtrlToZoomPan: "Hold Ctrl to zoom/pan",
      pins: "Pins",
      noPinsAdded: "No pins added yet",
      pin: "Pin",
      position: "Position",
      enterPinDescription: "Enter pin description:",
      placeholder: "e.g., Server Room, Exit, etc.",
      cancel: "Cancel",
      addPin: "Add Pin",
      clickToAddPins:
        "Click on the image to add pins. Click on existing pins to view details.",
      navigationInstructions:
        "Hold Ctrl and use mouse wheel to zoom in/out, or drag to pan around. Use the zoom buttons above for quick zoom.",
      floorPlanUploaded: "Floor plan uploaded successfully",
      failedToSaveFloorPlan: "Failed to save floor plan",
      failedToProcessImage: "Failed to process image file",
      failedToLoadFloorPlan: "Failed to load floor plan",
      failedToSavePin: "Failed to save pin",
      failedToDeletePin: "Failed to delete pin",
      failedToEditPin: "Failed to edit pin",
      pinAdded: "Pin added at coordinates:",
      pinDeleted: "Pin deleted successfully",
      pinEdited: "Pin edited successfully",
      confirmRemoveFloorPlan:
        "Are you sure you want to remove this floor plan? This action cannot be undone.",
      confirmDeletePin:
        "Are you sure you want to delete this pin? This action cannot be undone.",
      yes: "Yes",
      no: "No",
      unexpectedError: "An unexpected error occurred",
    },
    hr: {
      title: "Tlocrt",
      loading: "Učitavanje tlocrta...",
      noFloorPlan: "Nema učitanog tlocrta",
      uploadFloorPlan: "Učitaj tlocrt",
      replaceFloorPlan: "Zamijeni tlocrt",
      removeFloorPlan: "Ukloni tlocrt",
      zoom: "Zoom",
      navigation: "Navigacija",
      ctrlActive: "Ctrl aktivan",
      holdCtrlToZoomPan: "Držite Ctrl za zumiranje/pomicanje",
      pins: "Oznake",
      noPinsAdded: "Još nema oznaka",
      pin: "Oznaka",
      position: "Položaj",
      enterPinDescription: "Unesite opis oznake:",
      placeholder: "npr., Server soba, Izlaz, itd.",
      cancel: "Odustani",
      addPin: "Dodaj oznaku",
      clickToAddPins:
        "Kliknite na sliku za dodavanje oznaka. Kliknite na postojeće oznake za pregled detalja.",
      navigationInstructions:
        "Držite Ctrl i koristite kotačić miša za uvećanje/smanjivanje, ili povlačite za pomicanje. Koristite gumbove za uvećanje iznad za brzo uvećanje.",
      floorPlanUploaded: "Tlocrt uspješno učitan",
      failedToSaveFloorPlan: "Neuspjelo spremanje tlocrta",
      failedToProcessImage: "Neuspjelo procesiranje slike",
      failedToLoadFloorPlan: "Neuspjelo učitavanje tlocrta",
      failedToSavePin: "Neuspjelo spremanje oznake",
      failedToDeletePin: "Neuspjelo brisanje oznake",
      failedToEditPin: "Neuspjelo uređivanje oznake",
      pinAdded: "Oznaka dodana na koordinatama:",
      pinDeleted: "Oznaka uspješno obrisana",
      pinEdited: "Oznaka uspješno uređena",
      confirmRemoveFloorPlan:
        "Jeste li sigurni da želite ukloniti ovaj tlocrt? Ova radnja se ne može poništiti.",
      confirmDeletePin:
        "Jeste li sigurni da želite obrisati ovu oznaku? Ova radnja se ne može poništiti.",
      yes: "Da",
      no: "Ne",
      unexpectedError: "Došlo je do neočekivane greške",
    },
  };

  const t = translations[language];

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pin input state
  const [pinInput, setPinInput] = useState<{
    show: boolean;
    x: number;
    y: number;
    tempX: number;
    tempY: number;
  }>({
    show: false,
    x: 0,
    y: 0,
    tempX: 0,
    tempY: 0,
  });
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Hovered pin state for highlighting
  const [hoveredPinIndex, setHoveredPinIndex] = useState<number | null>(null);

  // Edit pin state
  const [editingPinIndex, setEditingPinIndex] = useState<number | null>(null);
  const [editingPinValue, setEditingPinValue] = useState("");
  const editPinRef = useRef<HTMLInputElement>(null);

  // Confirmation states
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [pinToDelete, setPinToDelete] = useState<number | null>(null);

  // Handle wheel events with conditional prevention
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const handleWheel = (e: WheelEvent) => {
        // Only prevent default when Ctrl is pressed (for zooming)
        // Otherwise, allow normal page scrolling
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

  // Focus pin input when it appears
  useEffect(() => {
    if (pinInput.show && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [pinInput.show]);

  // Focus edit input when it appears
  useEffect(() => {
    if (editingPinIndex !== null && editPinRef.current) {
      editPinRef.current.focus();
      editPinRef.current.select();
    }
  }, [editingPinIndex]);

  // Handle click outside to close pin input
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pinInput.show &&
        pinInputRef.current &&
        !pinInputRef.current.contains(event.target as Node)
      ) {
        // Check if click is not on the pin input or its buttons
        const target = event.target as Element;
        if (!target.closest("[data-pin-input]")) {
          handlePinInputCancel();
        }
      }
    };

    if (pinInput.show) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [pinInput.show]);

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
        // Stop dragging when Ctrl is released
        if (isDragging) {
          setIsDragging(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [isDragging]);

  const loadFloorPlan = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);

      const response = GetFloorPlan(resourceId);

      if (response.success) {
        setFloorPlan(response.floorPlan);
      } else {
        setError(response.message ?? t.failedToLoadFloorPlan);
      }
    } catch (err) {
      setError(t.unexpectedError);
      console.error("Error loading floor plan:", err);
    } finally {
      setIsLoading(false);
    }
  }, [resourceId, t]);

  // Load floor plan on component mount
  useEffect(() => {
    loadFloorPlan();
  }, [resourceId, loadFloorPlan]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);

      // Convert file to base64
      const base64 = await convertFileToBase64(file);

      // Save floor plan with empty pins array
      const response = SaveFloorPlan(organizationId, resourceId, base64, []);

      if (response.success) {
        setFloorPlan(response.floorPlan);
        console.log(t.floorPlanUploaded);
      } else {
        setError(response.message ?? t.failedToSaveFloorPlan);
      }
    } catch (err) {
      setError(t.failedToProcessImage);
      console.error("Error uploading floor plan:", err);
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!floorPlan) return;

    // Don't add pins when Ctrl is pressed (user is in navigation mode)
    if (isCtrlPressed) return;

    // Get the container's bounding rect (the viewport)
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Calculate the actual image position within the transformed container
    const imageRect = event.currentTarget.getBoundingClientRect();

    // Get the transformed image dimensions
    const transformedWidth = imageRect.width;
    const transformedHeight = imageRect.height;

    // Calculate the click position relative to the transformed image
    const clickX = event.clientX - imageRect.left;
    const clickY = event.clientY - imageRect.top;

    // Convert to percentage coordinates (0-1) on the original image
    const x = clickX / transformedWidth;
    const y = clickY / transformedHeight;

    // Ensure coordinates are within 0-1 range
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    // Debug logging to verify coordinate calculation
    console.log("Click coordinates:", {
      clientX: event.clientX,
      clientY: event.clientY,
      imageRect: {
        left: imageRect.left,
        top: imageRect.top,
        width: imageRect.width,
        height: imageRect.height,
      },
      clickRelative: { clickX, clickY },
      calculated: { x, y },
      clamped: { clampedX, clampedY },
      zoom,
      pan,
    });

    // Show pin input at click location
    setPinInput({
      show: true,
      x: clampedX,
      y: clampedY,
      tempX: event.clientX,
      tempY: event.clientY,
    });
  };

  const handlePinClick = (pin: FloorPlanPin, index?: number) => {
    console.log("Pin clicked:", pin.description, "at coordinates:", {
      x: pin.x,
      y: pin.y,
    });

    // If clicked from sidebar, center the view on the pin
    if (index !== undefined) {
      centerOnPin(pin);
    }
  };

  const centerOnPin = (pin: FloorPlanPin) => {
    // First reset zoom to 100%
    setZoom(1);

    // Wait for zoom to reset, then center the pin
    setTimeout(() => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      // Calculate the pin's position in the viewport at 100% zoom
      const pinX = pin.x * containerRect.width;
      const pinY = pin.y * containerRect.height;

      // Center the pin in the viewport
      const centerX = containerRect.width / 2;
      const centerY = containerRect.height / 2;

      // Calculate the pan offset to center the pin
      const newPanX = centerX - pinX;
      const newPanY = centerY - pinY;

      setPan({ x: newPanX, y: newPanY });
    }, 100); // Small delay to ensure zoom reset is applied
  };

  const deletePin = (index: number) => {
    setPinToDelete(index);
  };

  const confirmDeletePin = () => {
    if (!floorPlan || pinToDelete === null) return;

    // Remove the pin at the specified index
    const updatedPins = floorPlan.pins.filter((_, i) => i !== pinToDelete);

    // Save updated floor plan
    const response = SaveFloorPlan(
      organizationId,
      resourceId,
      floorPlan.imageBase64,
      updatedPins
    );

    if (response.success) {
      setFloorPlan(response.floorPlan);
      console.log(t.pinDeleted);

      // Clear hover state if the deleted pin was hovered
      if (hoveredPinIndex === pinToDelete) {
        setHoveredPinIndex(null);
      }
    } else {
      setError(t.failedToDeletePin);
    }

    setPinToDelete(null);
  };

  const cancelDeletePin = () => {
    setPinToDelete(null);
  };

  const startEditPin = (index: number, currentDescription: string) => {
    setEditingPinIndex(index);
    setEditingPinValue(currentDescription);
  };

  const saveEditPin = (index: number) => {
    if (!floorPlan || !editingPinValue.trim()) return;

    // Create updated pins array with the edited pin
    const updatedPins = floorPlan.pins.map((pin, i) =>
      i === index ? { ...pin, description: editingPinValue.trim() } : pin
    );

    // Save updated floor plan
    const response = SaveFloorPlan(
      organizationId,
      resourceId,
      floorPlan.imageBase64,
      updatedPins
    );

    if (response.success) {
      setFloorPlan(response.floorPlan);
      console.log(t.pinEdited, {
        index,
        newDescription: editingPinValue.trim(),
      });
      setEditingPinIndex(null);
      setEditingPinValue("");
    } else {
      setError(t.failedToEditPin);
    }
  };

  const cancelEditPin = () => {
    setEditingPinIndex(null);
    setEditingPinValue("");
  };

  const handlePinInputSubmit = (description: string) => {
    if (!description.trim() || !floorPlan) return;

    const newPin: FloorPlanPin = {
      x: pinInput.x,
      y: pinInput.y,
      description: description.trim(),
    };

    // Add new pin to existing pins
    const updatedPins = [...floorPlan.pins, newPin];

    // Save updated floor plan
    const response = SaveFloorPlan(
      organizationId,
      resourceId,
      floorPlan.imageBase64,
      updatedPins
    );

    if (response.success) {
      setFloorPlan(response.floorPlan);
      console.log(t.pinAdded, {
        x: pinInput.x,
        y: pinInput.y,
        description: description.trim(),
      });
    } else {
      setError(t.failedToSavePin);
    }

    // Hide pin input
    setPinInput((prev) => ({ ...prev, show: false }));
  };

  const handlePinInputCancel = () => {
    setPinInput((prev) => ({ ...prev, show: false }));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFloorPlan = () => {
    setShowRemoveConfirm(true);
  };

  const confirmRemoveFloorPlan = () => {
    if (!floorPlan) return;

    try {
      // Remove the floor plan from localStorage completely
      DeleteFloorPlan(resourceId);

      // Reset component state
      setFloorPlan(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setHoveredPinIndex(null);
      setEditingPinIndex(null);
      setEditingPinValue("");
      console.log("Floor plan removed successfully");
    } catch (err) {
      setError("Failed to remove floor plan");
      console.error("Error removing floor plan:", err);
    } finally {
      setShowRemoveConfirm(false);
    }
  };

  const cancelRemoveFloorPlan = () => {
    setShowRemoveConfirm(false);
  };

  // Zoom and pan functions
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.5, 0.1));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (!isCtrlPressed) return; // Only zoom when Ctrl is pressed

      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, zoom * delta));

      // Calculate zoom center point for better zoom experience
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
    },
    [zoom, isCtrlPressed]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button === 0 && isCtrlPressed) {
        // Left mouse button only, and only when Ctrl is pressed
        setIsDragging(true);
        setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
      }
    },
    [pan.x, pan.y, isCtrlPressed]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (isDragging) {
        setPan({
          x: event.clientX - dragStart.x,
          y: event.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart.x, dragStart.y]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>{t.loading}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!floorPlan ? (
        <Paper
          sx={{
            p: 3,
            textAlign: "center",
            backgroundColor: "background.default",
            border: "2px dashed",
            borderColor: "divider",
          }}
        >
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {t.noFloorPlan}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleUploadClick}
            sx={{ mt: 1 }}
          >
            {t.uploadFloorPlan}
          </Button>
        </Paper>
      ) : (
        <Box>
          <Box
            sx={{
              mb: 2,
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Button
              variant="outlined"
              onClick={handleUploadClick}
              startIcon={<AddIcon />}
            >
              {t.replaceFloorPlan}
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleRemoveFloorPlan}
              sx={{ borderColor: "error.main", color: "error.main" }}
            >
              {t.removeFloorPlan}
            </Button>

            {/* Zoom Controls */}
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                {t.zoom}: {Math.round(zoom * 100)}%
              </Typography>
              <IconButton
                size="small"
                onClick={handleZoomOut}
                disabled={zoom <= 0.1}
              >
                <ZoomOutIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleZoomIn}
                disabled={zoom >= 5}
              >
                <ZoomInIcon />
              </IconButton>
              <IconButton size="small" onClick={handleResetView}>
                <CenterIcon />
              </IconButton>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  ml: 1,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: isCtrlPressed
                    ? "primary.main"
                    : "transparent",
                  color: isCtrlPressed
                    ? "primary.contrastText"
                    : "text.secondary",
                  transition: "all 0.2s ease",
                  fontSize: "0.75rem",
                  fontStyle: "italic",
                }}
              >
                {isCtrlPressed ? t.ctrlActive : t.holdCtrlToZoomPan}
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            {/* Floor Plan Image */}
            <Paper
              sx={{
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                maxWidth: "100%",
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                flex: 1,
                minHeight: 400,
              }}
            >
              <Box
                ref={containerRef}
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  cursor: isDragging
                    ? "grabbing"
                    : isCtrlPressed
                    ? "grab"
                    : "crosshair",
                  "&:active": { cursor: isDragging ? "grabbing" : "crosshair" },
                }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <Box
                  sx={{
                    transform: `translate(${pan.x.toString()}px, ${pan.y.toString()}px) scale(${zoom.toString()})`,
                    transformOrigin: "0 0",
                    transition: isDragging ? "none" : "transform 0.1s ease-out",
                    filter:
                      pinInput.show || showRemoveConfirm || pinToDelete !== null
                        ? "blur(2px)"
                        : "none",
                  }}
                >
                  <img
                    src={floorPlan.imageBase64}
                    alt={t.title}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      height: "auto",
                      width: "auto",
                      cursor: isCtrlPressed ? "grab" : "crosshair",
                      display: "block",
                      userSelect: "none",
                      objectFit: "contain",
                    }}
                    onClick={handleImageClick}
                    draggable={false}
                  />

                  {/* Render pins */}
                  {floorPlan.pins.map((pin, index) => (
                    <Tooltip key={index} title={pin.description} arrow>
                      <IconButton
                        sx={{
                          position: "absolute",
                          left: `${(pin.x * 100).toString()}%`,
                          top: `${(pin.y * 100).toString()}%`,
                          transform: "translate(-50%, -50%)",
                          color:
                            hoveredPinIndex === index
                              ? "primary.main"
                              : "error.main",
                          backgroundColor:
                            hoveredPinIndex === index
                              ? "primary.light"
                              : "white",
                          border: "2px solid",
                          borderColor:
                            hoveredPinIndex === index
                              ? "primary.main"
                              : "error.main",
                          "&:hover": {
                            backgroundColor: "error.light",
                            color: "white",
                          },
                          width: 32,
                          height: 32,
                          zIndex: 10,
                          pointerEvents: "auto",
                          transition: "all 0.2s ease",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinClick(pin);
                        }}
                      >
                        <PlaceIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            </Paper>

            {/* Pins Sidebar */}
            <Paper
              sx={{
                width: { xs: "100%", md: 280 },
                maxHeight: { xs: 300, md: 600 },
                overflow: "auto",
                border: "1px solid",
                borderColor: "divider",
                p: 2,
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                {t.pins} ({floorPlan.pins.length})
              </Typography>

              {floorPlan.pins.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center", py: 2 }}
                >
                  {t.noPinsAdded}
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {floorPlan.pins.map((pin, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor:
                          hoveredPinIndex === index
                            ? "primary.main"
                            : "divider",
                        backgroundColor:
                          hoveredPinIndex === index
                            ? "primary.light"
                            : "background.paper",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: "primary.main",
                          backgroundColor: "primary.light",
                        },
                      }}
                      onMouseEnter={() => {
                        setHoveredPinIndex(index);
                      }}
                      onMouseLeave={() => {
                        setHoveredPinIndex(null);
                      }}
                      onClick={() => {
                        handlePinClick(pin, index);
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 0.5,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flex: 1,
                          }}
                        >
                          <PlaceIcon
                            fontSize="small"
                            sx={{
                              color:
                                hoveredPinIndex === index
                                  ? "primary.main"
                                  : "error.main",
                              fontSize: "1rem",
                            }}
                          />
                          {editingPinIndex === index ? (
                            <TextField
                              inputRef={editPinRef}
                              value={editingPinValue}
                              onChange={(e) => {
                                setEditingPinValue(e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveEditPin(index);
                                } else if (e.key === "Escape") {
                                  cancelEditPin();
                                }
                              }}
                              onBlur={() => {
                                saveEditPin(index);
                              }}
                              size="small"
                              variant="outlined"
                              sx={{
                                flex: 1,
                                minWidth: 0,
                                "& .MuiOutlinedInput-root": {
                                  fontSize: "14px",
                                  height: "32px",
                                },
                              }}
                            />
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: "medium",
                                color:
                                  hoveredPinIndex === index
                                    ? "primary.main"
                                    : "text.primary",
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              {pin.description}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          {editingPinIndex === index ? (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  saveEditPin(index);
                                }}
                                sx={{
                                  color: "success.main",
                                  "&:hover": {
                                    backgroundColor: "success.light",
                                    color: "white",
                                  },
                                  width: 24,
                                  height: 24,
                                }}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={cancelEditPin}
                                sx={{
                                  color: "warning.main",
                                  "&:hover": {
                                    backgroundColor: "warning.light",
                                    color: "white",
                                  },
                                  width: 24,
                                  height: 24,
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditPin(index, pin.description);
                                }}
                                sx={{
                                  color: "info.main",
                                  "&:hover": {
                                    backgroundColor: "info.light",
                                    color: "white",
                                  },
                                  width: 24,
                                  height: 24,
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePin(index);
                                }}
                                sx={{
                                  color: "error.main",
                                  "&:hover": {
                                    backgroundColor: "error.light",
                                    color: "white",
                                  },
                                  width: 24,
                                  height: 24,
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Box>

          {/* Floor Plan Removal Confirmation Dialog */}
          {showRemoveConfirm && (
            <Box
              sx={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 1000,
                backgroundColor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                boxShadow: 3,
                p: 3,
                minWidth: 400,
                maxWidth: 500,
              }}
            >
              <Typography gutterBottom>{t.confirmRemoveFloorPlan}</Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  justifyContent: "flex-end",
                  mt: 1,
                }}
              >
                <Button variant="outlined" onClick={cancelRemoveFloorPlan}>
                  {t.no}
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={confirmRemoveFloorPlan}
                >
                  {t.yes}
                </Button>
              </Box>
            </Box>
          )}

          {/* Pin Deletion Confirmation Dialog */}
          {pinToDelete !== null && (
            <Box
              sx={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 1000,
                backgroundColor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                boxShadow: 3,
                p: 3,
                minWidth: 400,
                maxWidth: 500,
              }}
            >
              <Typography variant="h6" gutterBottom>
                {t.confirmDeletePin}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  justifyContent: "flex-end",
                  mt: 3,
                }}
              >
                <Button variant="outlined" onClick={cancelDeletePin}>
                  {t.no}
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={confirmDeletePin}
                >
                  {t.yes}
                </Button>
              </Box>
            </Box>
          )}

          {/* Floating Pin Input */}
          {pinInput.show && (
            <Box
              data-pin-input
              sx={{
                position: "fixed",
                left: pinInput.tempX - 100, // Center the input above the click
                top: pinInput.tempY - 80, // Position above the click
                zIndex: 1000,
                backgroundColor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                boxShadow: 3,
                p: 1,
                minWidth: 200,
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {t.enterPinDescription}
                </Typography>
                <TextField
                  inputRef={pinInputRef}
                  placeholder={t.placeholder}
                  size="small"
                  variant="outlined"
                  fullWidth
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handlePinInputSubmit(
                        (e.currentTarget as HTMLInputElement).value
                      );
                    } else if (e.key === "Escape") {
                      handlePinInputCancel();
                    }
                  }}
                  onBlur={() => {
                    // Small delay to allow button clicks
                    setTimeout(() => {
                      handlePinInputCancel();
                    }, 100);
                  }}
                />
                <Box
                  sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
                >
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handlePinInputCancel}
                    sx={{ minWidth: 60 }}
                  >
                    {t.cancel}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      const input = pinInputRef.current;
                      if (input) {
                        handlePinInputSubmit(input.value);
                      }
                    }}
                    sx={{ minWidth: 60 }}
                  >
                    {t.addPin}
                  </Button>
                </Box>
              </Box>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t.clickToAddPins}
            <br />
            <strong>{t.navigation}:</strong> {t.navigationInstructions}
          </Typography>
        </Box>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          void handleFileUpload(e);
        }}
        style={{ display: "none" }}
      />
    </Box>
  );
};

export default FloorPlanSelector;
