import { NhostProvider, NhostReactProvider } from '@nhost/react';
import Pages from './pages/index.jsx';
import { nhost } from './lib/nhostClient.js';

function App() {
  return (
    <NhostProvider nhost={nhost}>
      <NhostReactProvider nhost={nhost}>
        <Pages />
      </NhostReactProvider>
    </NhostProvider>
  );
}

export default App;
