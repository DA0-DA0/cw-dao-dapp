import { SVGProps } from 'react'

export const ProfileIcon = ({
  width,
  height,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    height={height ?? 40}
    viewBox="0 0 40 40"
    width={width ?? 40}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M0 20C0 8.95431 8.95431 0 20 0V0C31.0457 0 40 8.95431 40 20V20C40 31.0457 31.0457 40 20 40V40C8.95431 40 0 31.0457 0 20V20Z"
      fill="url(#paint0_radial_203_32220)"
    />
    <path
      d="M19.9998 16.0003C20.7332 16.0003 21.3332 16.6003 21.3332 17.3337C21.3332 18.067 20.7332 18.667 19.9998 18.667C19.2665 18.667 18.6665 18.067 18.6665 17.3337C18.6665 16.6003 19.2665 16.0003 19.9998 16.0003ZM19.9998 22.0003C21.7998 22.0003 23.8665 22.8603 23.9998 23.3337V24.0003H15.9998V23.3403C16.1332 22.8603 18.1998 22.0003 19.9998 22.0003ZM19.9998 14.667C18.5265 14.667 17.3332 15.8603 17.3332 17.3337C17.3332 18.807 18.5265 20.0003 19.9998 20.0003C21.4732 20.0003 22.6665 18.807 22.6665 17.3337C22.6665 15.8603 21.4732 14.667 19.9998 14.667ZM19.9998 20.667C18.2198 20.667 14.6665 21.5603 14.6665 23.3337V25.3337H25.3332V23.3337C25.3332 21.5603 21.7798 20.667 19.9998 20.667Z"
      fill="#F3F6F8"
      fillOpacity="0.9"
    />
    <defs>
      <radialGradient
        cx="0"
        cy="0"
        gradientTransform="translate(65 9.5) rotate(169.842) scale(121.911 195.048)"
        gradientUnits="userSpaceOnUse"
        id="paint0_radial_203_32220"
        r="1"
      >
        <stop offset="0.165255" stopColor="#F99974" />
        <stop offset="0.336766" stopColor="#FE4366" />
        <stop offset="0.450237" stopColor="#F43D88" />
        <stop offset="0.545461" stopColor="#D72DE5" />
        <stop offset="0.732872" stopColor="#3B7BEA" />
        <stop offset="0.828125" stopColor="#30B1CD" />
        <stop offset="0.927083" stopColor="#40CAD7" />
        <stop offset="1" stopColor="#09ACA2" />
      </radialGradient>
    </defs>
  </svg>
)
