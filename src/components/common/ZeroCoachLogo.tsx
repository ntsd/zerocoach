import React from 'react';
import Svg, { Path, Line, Defs, LinearGradient, Stop, SvgProps } from 'react-native-svg';

interface ZeroCoachLogoProps extends SvgProps {
  size?: number;
  mode?: 'strict' | 'comfortable' | 'dual';
}

export const ZeroCoachLogo: React.FC<ZeroCoachLogoProps> = ({
  size = 24,
  mode = 'dual',
  ...props
}) => {
  const ringGradient =
    mode === 'strict'
      ? ['#00F0FF', '#0072FF']
      : mode === 'comfortable'
      ? ['#10B981', '#059669']
      : ['#00F0FF', '#3B82F6'];

  const bladeGradient =
    mode === 'strict'
      ? ['#00F0FF', '#0072FF']
      : mode === 'comfortable'
      ? ['#10B981', '#059669']
      : ['#10B981', '#00F0FF'];

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none" {...props}>
      <Defs>
        <LinearGradient id="zc-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={ringGradient[0]} />
          <Stop offset="100%" stopColor={ringGradient[1]} />
        </LinearGradient>
        <LinearGradient id="zc-blade-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={bladeGradient[0]} />
          <Stop offset="100%" stopColor={bladeGradient[1]} />
        </LinearGradient>
      </Defs>

      {/* Dynamic Upper Right Arc */}
      <Path
        d="M 50 14 C 70 14 84 29 84 50 C 84 61 79 71 70 78"
        stroke="url(#zc-ring-grad)"
        strokeWidth={9}
        strokeLinecap="round"
      />

      {/* Dynamic Lower Left Arc */}
      <Path
        d="M 50 86 C 30 86 16 71 16 50 C 16 39 21 29 30 22"
        stroke="url(#zc-ring-grad)"
        strokeWidth={9}
        strokeLinecap="round"
      />

      {/* 45-degree Forward Velocity Blade */}
      <Line
        x1={24}
        y1={76}
        x2={76}
        y2={24}
        stroke="url(#zc-blade-grad)"
        strokeWidth={9}
        strokeLinecap="round"
      />
    </Svg>
  );
};
