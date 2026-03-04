"use client";
import React, { useRef, useState, useEffect } from "react";
import { gsap } from "gsap";

export interface ModernRetroButtonColors {
  textDefault?: string;
  textHover?: string;
  background?: string;
  boxShadow?: string;
  boxShadowHover?: string;
  svgRect?: string;
  svgRectFlicker?: string;
  elasticity?: string;
}

export interface ModernRetroButtonProps extends ModernRetroButtonColors {
  onClick?: () => void;
  label: string;
}

const ModernRetroButton: React.FC<ModernRetroButtonProps> = ({
  onClick,
  label,
  textDefault = "#f7f7ff",
  textHover = "#111118",
  background = "#181a29",
  boxShadow = "0 0 0 0 #0763f7",
  boxShadowHover = "0 0 20px 2px #0763f7",
  svgRect = "#76b3fa",
  svgRectFlicker = "#0c79f7",
  elasticity = "elastic.out(12, 0.3)",
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [textColor, setTextColor] = useState(textDefault);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isHovered) {
      timer = setTimeout(() => {
        setTextColor(textHover);
      }, 1000);
    } else {
      setTextColor(textDefault);
    }
    return () => clearTimeout(timer);
  }, [isHovered, textDefault, textHover]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (buttonRef.current) {
      const rects = buttonRef.current.querySelectorAll<SVGRectElement>("rect.bar");
      gsap.to(rects, {
        duration: 0.8,
        ease: elasticity,
        x: "100%",
        stagger: 0.01,
        overwrite: true,
        onComplete: () => flickerEffect(rects),
      });
    }
  };

  const flickerEffect = (rects: NodeListOf<SVGRectElement>) => {
    gsap.fromTo(
      rects,
      { fill: svgRectFlicker },
      {
        fill: svgRect,
        duration: 0.1,
        ease: elasticity,
        repeat: -1,
        yoyo: true,
      }
    );
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (buttonRef.current) {
      const rects = buttonRef.current.querySelectorAll<SVGRectElement>("rect.bar");
      gsap.to(rects, {
        duration: 0.8,
        ease: elasticity,
        x: "-100%",
        stagger: 0.01,
        overwrite: true,
        onComplete: () => {
          rects.forEach((node) => node.setAttribute("fill", svgRect));
        },
      });
    }
  };

  return (
    <button
      ref={buttonRef}
      className="retro-button"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        boxShadow: isHovered ? boxShadowHover : boxShadow,
        position: "relative",
        background: "transparent",
      }}
    >
      {/* SVG Background */}
      <svg
        className="bg-svg"
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          borderRadius: 15,
          pointerEvents: "none",
        }}
      >
        <rect x="0" y="0" width="100%" height="100%" rx="15" fill={background} />
      </svg>

      {/* Animated Bars */}
      <svg
        className="bars-svg"
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          borderRadius: 15,
          pointerEvents: "none",
        }}
      >
        <g className="left">
          {[...Array(25)].map((_, index) => (
            <rect
              className="bar"
              key={index}
              x="-100%"
              y={index * 2}
              width="100%"
              height="2"
              fill={svgRect}
            />
          ))}
        </g>
      </svg>

      {/* Label */}
      <span style={{ color: textColor, zIndex: 2, position: "relative" }}>
        {label}
      </span>
    </button>
  );
};

export default ModernRetroButton;
