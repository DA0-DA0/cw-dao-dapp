import { SVGProps } from 'react'

export const GovernanceIcon = ({
  width,
  height,
  color,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    height={height ?? 14}
    viewBox="0 0 13 14"
    width={width ?? 13}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M3.33334 6.4137H2V11.0804H3.33334V6.4137ZM7.33334 6.4137H6V11.0804H7.33334V6.4137ZM13 12.4137H0.333336V13.747H13V12.4137ZM11.3333 6.4137H10V11.0804H11.3333V6.4137ZM6.66667 1.92036L10.14 3.74703H3.19334L6.66667 1.92036ZM6.66667 0.413696L0.333336 3.74703V5.08036H13V3.74703L6.66667 0.413696Z"
      fill={color}
      fillOpacity="0.9"
    />
  </svg>
)
