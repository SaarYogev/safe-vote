import React from 'react';
import { View, Image } from 'react-native';

const CLOCK_PNG_HISTORY =
  'data:image/png;base64,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';

export type IconName =
  | 'poll'
  | 'history'
  | 'history-base'
  | 'history-smooth'
  | 'history-soft'
  | 'history-heavy'
  | 'history-arrow'
  | 'history-filled'
  | 'history-original'
  | 'history-cutout'
  | 'history-baked'
  | 'history-bold'
  | 'history-row'
  | 'settings'
  | 'search'
  | 'chevron-down'
  | 'chevron-up'
  | 'check'
  | 'eye'
  | 'eye-off'
  | 'info'
  | 'copy'
  | 'close'
  | 'badge-winner'
  | 'theme-system'
  | 'theme-dark'
  | 'theme-light'
  | 'refresh'
  | 'server'
  | 'shield'
  | 'palette';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  bgColor?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#1C1C1E', bgColor }) => {
  const containerStyle = {
    width: size,
    height: size,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  switch (name) {
    case 'poll': {
      const boxW = Math.round(size * 0.88);
      const boxH = Math.round(size * 0.52);
      const paperW = Math.round(size * 0.48);
      const paperH = Math.round(size * 0.44);
      const stroke = 2;
      const bg = bgColor || (color === '#FFFFFF' ? '#1C1C1E' : '#FFFFFF');
      return (
        <View style={containerStyle}>
          <View
            style={{
              position: 'absolute',
              top: Math.round(size * 0.06),
              width: paperW,
              height: paperH,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 2,
              backgroundColor: bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 4,
                height: 7,
                borderBottomWidth: stroke,
                borderRightWidth: stroke,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
                marginTop: -2,
              }}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              bottom: Math.round(size * 0.08),
              width: boxW,
              height: boxH,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 3,
            }}
          />
        </View>
      );
    }

    case 'history-original': {
      const ringSize = Math.round(size * 0.85);
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: 1.8,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: Math.round(ringSize * 0.18),
                width: 1.8,
                height: Math.round(ringSize * 0.3),
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: Math.round(ringSize * 0.42),
                top: Math.round(ringSize * 0.42),
                width: Math.round(ringSize * 0.28),
                height: 1.8,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      );
    }

    case 'history-cutout': {
      const outer = Math.round(size * 0.88);
      const stroke = 2.2;
      const inner = outer - stroke * 2;
      const bg = bgColor || (color === '#FFFFFF' ? '#1C1C1E' : '#FFFFFF');
      const handRadius = Math.round(inner * 0.36);
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: outer,
              height: outer,
              borderRadius: outer / 2,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: inner,
                height: inner,
                borderRadius: inner / 2,
                backgroundColor: bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  bottom: Math.round(inner / 2),
                  width: stroke,
                  height: handRadius,
                  backgroundColor: color,
                  borderRadius: stroke / 2,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: Math.round(inner / 2),
                  width: handRadius,
                  height: stroke,
                  backgroundColor: color,
                  borderRadius: stroke / 2,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  width: stroke * 2,
                  height: stroke * 2,
                  borderRadius: stroke,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        </View>
      );
    }

    case 'history':
    case 'history-soft':
    case 'history-smooth':
    case 'history-base':
    case 'history-bold':
    case 'history-baked':
    case 'history-heavy':
    case 'history-arrow':
    case 'history-filled':
    case 'history-row':
      return (
        <View style={containerStyle}>
          <Image
            source={{ uri: CLOCK_PNG_HISTORY }}
            style={{ width: size, height: size, tintColor: color }}
            resizeMode="contain"
          />
        </View>
      );

    case 'settings': {
      const toothW = Math.max(4, Math.round(size * 0.22));
      const toothL = Math.round(size * 0.85);
      const hubSize = Math.round(size * 0.62);
      const holeSize = Math.round(size * 0.24);
      const toothRadius = Math.round(toothW / 2);
      const bg = bgColor || (color === '#FFFFFF' ? '#1C1C1E' : '#FFFFFF');
      return (
        <View style={containerStyle}>
          <View
            style={{
              position: 'absolute',
              width: toothW,
              height: toothL,
              backgroundColor: color,
              borderRadius: toothRadius,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: toothW,
              height: toothL,
              backgroundColor: color,
              borderRadius: toothRadius,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: toothW,
              height: toothL,
              backgroundColor: color,
              borderRadius: toothRadius,
              transform: [{ rotate: '90deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: toothW,
              height: toothL,
              backgroundColor: color,
              borderRadius: toothRadius,
              transform: [{ rotate: '135deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: hubSize,
              height: hubSize,
              borderRadius: hubSize / 2,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: holeSize,
              height: holeSize,
              borderRadius: holeSize / 2,
              backgroundColor: bg,
            }}
          />
        </View>
      );
    }

    case 'search':
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: size * 0.55,
              height: size * 0.55,
              borderRadius: (size * 0.55) / 2,
              borderWidth: 1.8,
              borderColor: color,
              position: 'relative',
              top: -size * 0.08,
              left: -size * 0.08,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: size * 0.12,
              right: size * 0.12,
              width: size * 0.32,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'chevron-down':
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: size * 0.45,
              height: size * 0.45,
              borderBottomWidth: 2,
              borderRightWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginTop: -size * 0.15,
            }}
          />
        </View>
      );

    case 'chevron-up':
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: size * 0.45,
              height: size * 0.45,
              borderTopWidth: 2,
              borderLeftWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginTop: size * 0.15,
            }}
          />
        </View>
      );

    case 'check':
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: size * 0.3,
              height: size * 0.55,
              borderBottomWidth: 2.2,
              borderRightWidth: 2.2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginTop: -size * 0.1,
            }}
          />
        </View>
      );

    case 'eye':
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: size * 0.85,
              height: size * 0.48,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: size * 0.3,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: size * 0.22,
                height: size * 0.22,
                borderRadius: (size * 0.22) / 2,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'eye-off':
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: size * 0.85,
              height: size * 0.48,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: size * 0.3,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: size * 0.22,
                height: size * 0.22,
                borderRadius: (size * 0.22) / 2,
                backgroundColor: color,
              }}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              width: size * 0.95,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'info':
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: size * 0.8,
              height: size * 0.8,
              borderRadius: (size * 0.8) / 2,
              borderWidth: 1.8,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 2,
                height: 2,
                backgroundColor: color,
                borderRadius: 1,
                marginBottom: 2,
              }}
            />
            <View
              style={{
                width: 2,
                height: size * 0.25,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      );

    case 'copy':
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: size * 0.5,
              height: size * 0.6,
              borderWidth: 1.5,
              borderColor: color,
              borderRadius: 2,
              position: 'absolute',
              top: size * 0.1,
              left: size * 0.15,
            }}
          />
          <View
            style={{
              width: size * 0.5,
              height: size * 0.6,
              borderWidth: 1.5,
              borderColor: color,
              borderRadius: 2,
              backgroundColor: 'transparent',
              position: 'absolute',
              bottom: size * 0.1,
              right: size * 0.15,
            }}
          />
        </View>
      );

    case 'close':
      return (
        <View style={containerStyle}>
          <View
            style={{
              position: 'absolute',
              width: size * 0.6,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
              borderRadius: 1,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: size * 0.6,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'badge-winner':
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: size * 0.7,
              height: size * 0.7,
              borderRadius: (size * 0.7) / 2,
              borderWidth: 1.8,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: size * 0.2,
                height: size * 0.35,
                borderBottomWidth: 1.8,
                borderRightWidth: 1.8,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
                marginTop: -size * 0.08,
              }}
            />
          </View>
        </View>
      );

    case 'theme-system': {
      const w = Math.round(size * 0.68);
      const h = Math.round(size * 0.88);
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: w,
              height: h,
              borderRadius: 3,
              borderWidth: 1.8,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 2,
            }}
          >
            <View
              style={{
                width: Math.round(w * 0.4),
                height: 1.5,
                borderRadius: 1,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                width: Math.round(w * 0.3),
                height: 1.5,
                borderRadius: 1,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );
    }

    case 'theme-dark': {
      const moonSize = Math.round(size * 0.82);
      const cutoutSize = Math.round(moonSize * 0.88);
      const bg = bgColor || (color === '#FFFFFF' ? '#1C1C1E' : '#FFFFFF');
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: moonSize,
              height: moonSize,
              borderRadius: moonSize / 2,
              backgroundColor: color,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -Math.round(moonSize * 0.12),
                right: -Math.round(moonSize * 0.12),
                width: cutoutSize,
                height: cutoutSize,
                borderRadius: cutoutSize / 2,
                backgroundColor: bg,
              }}
            />
          </View>
        </View>
      );
    }

    case 'theme-light': {
      const centerSize = Math.round(size * 0.4);
      const rayL = Math.round(size * 0.85);
      const stroke = 1.8;
      return (
        <View style={containerStyle}>
          <View
            style={{
              position: 'absolute',
              width: stroke,
              height: rayL,
              backgroundColor: color,
              borderRadius: stroke / 2,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: stroke,
              height: rayL,
              backgroundColor: color,
              borderRadius: stroke / 2,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: stroke,
              height: rayL,
              backgroundColor: color,
              borderRadius: stroke / 2,
              transform: [{ rotate: '90deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: stroke,
              height: rayL,
              backgroundColor: color,
              borderRadius: stroke / 2,
              transform: [{ rotate: '135deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: centerSize,
              height: centerSize,
              borderRadius: centerSize / 2,
              backgroundColor: color,
            }}
          />
        </View>
      );
    }

    case 'refresh': {
      const ring = Math.round(size * 0.78);
      const stroke = 2;
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: ring,
              height: ring,
              borderRadius: ring / 2,
              borderWidth: stroke,
              borderColor: color,
              borderTopColor: 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: '-30deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: Math.round(size * 0.08),
              right: Math.round(size * 0.16),
              width: 0,
              height: 0,
              borderLeftWidth: 3.5,
              borderRightWidth: 3.5,
              borderBottomWidth: 5,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );
    }

    case 'server': {
      const w = Math.round(size * 0.88);
      const h = Math.max(5, Math.round(size * 0.28));
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: w,
              height: h,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: 3,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingHorizontal: 3,
              marginBottom: 3,
            }}
          >
            <View
              style={{
                width: 2.5,
                height: 2.5,
                borderRadius: 1.25,
                backgroundColor: color,
                marginRight: 2,
              }}
            />
            <View
              style={{
                width: 2.5,
                height: 2.5,
                borderRadius: 1.25,
                backgroundColor: color,
              }}
            />
          </View>
          <View
            style={{
              width: w,
              height: h,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: 3,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingHorizontal: 3,
            }}
          >
            <View
              style={{
                width: 2.5,
                height: 2.5,
                borderRadius: 1.25,
                backgroundColor: color,
                marginRight: 2,
              }}
            />
            <View
              style={{
                width: 2.5,
                height: 2.5,
                borderRadius: 1.25,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );
    }

    case 'shield': {
      const w = Math.round(size * 0.76);
      const h = Math.round(size * 0.88);
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: w,
              height: h,
              borderWidth: 2,
              borderColor: color,
              borderTopLeftRadius: 5,
              borderTopRightRadius: 5,
              borderBottomLeftRadius: Math.round(w / 2),
              borderBottomRightRadius: Math.round(w / 2),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: Math.round(w * 0.35),
                height: Math.round(w * 0.35),
                borderRadius: Math.round(w * 0.18),
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );
    }

    case 'palette': {
      const d = Math.round(size * 0.84);
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: d,
              height: d,
              borderRadius: d / 2,
              borderWidth: 1.8,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: Math.round(d * 0.18),
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: Math.round(d * 0.18),
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: Math.round(d * 0.18),
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );
    }

    default:
      return null;
  }
};
