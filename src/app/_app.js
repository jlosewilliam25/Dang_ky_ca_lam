import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
import '../styles/globals.css';

const theme = extendTheme({
  styles: {
    global: (props) => ({
      body: {
        bg: mode('brand.50', 'brand.900')(props),
      },
    }),
  },
  colors: {
    brand: {
      50: '#f3e8ff', // tím nhạt
      100: '#e9d5ff',
      200: '#d8b4fe',
      300: '#c084fc',
      400: '#a855f7',
      500: '#9333ea',
      600: '#7e22ce',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
  },
});

export default function App({ Component, pageProps }) {
  return (
    <ChakraProvider theme={theme}>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}
