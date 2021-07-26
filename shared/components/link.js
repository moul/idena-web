/* eslint-disable react/prop-types */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react'
import PropTypes from 'prop-types'
import NextLink from 'next/link'
import {Icon, Link as ChakraLink, Stack, Text} from '@chakra-ui/react'
import theme from '../theme'

function Link({
  href,
  color,
  hoverColor = color,
  fontSize,
  children,
  width,
  height,
  ...props
}) {
  return (
    <NextLink href={href}>
      <a {...props}>
        {children}
        <style jsx>{`
          a,
          a:hover,
          a:visited,
          a:active {
            color: ${color};
            font-size: ${fontSize};
            text-decoration: none;
            display: inline-block;
            width: ${width};
            height: ${height};
          }

          a:hover {
            color: ${hoverColor};
          }
        `}</style>
      </a>
    </NextLink>
  )
}

Link.defaultProps = {
  ...theme.Link,
}

Link.propTypes = {
  href: PropTypes.string.isRequired,
  color: PropTypes.string,
  hoverColor: PropTypes.string,
  fontSize: PropTypes.string,
  width: PropTypes.string,
  height: PropTypes.string,
  children: PropTypes.node,
}

export const IconLink = React.forwardRef(function IconLink(
  {href, icon, children, ...props},
  ref
) {
  return (
    <NextLink ref={ref} href={href} passHref>
      <ChakraLink
        href={href}
        color="brandBlue.500"
        rounded="md"
        fontWeight={500}
        display="inline-block"
        h={8}
        px={2}
        py="3/2"
        _hover={{
          bg: 'blue.50',
        }}
        {...props}
      >
        <Stack spacing={2} isInline align="center">
          {typeof icon === 'string' ? <Icon name={icon} size={4} /> : icon}
          <Text as="span">{children}</Text>
        </Stack>
      </ChakraLink>
    </NextLink>
  )
})

export default Link
