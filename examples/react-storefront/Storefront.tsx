import { createRoot } from 'react-dom/client';
import { ProductCard } from './ProductCard';

function Storefront() {
  const broken = new URLSearchParams(window.location.search).has('broken');
  return (
    <>
      <header><p>Commerce Accessibility Lab — demonstração React</p></header>
      <main>
        <h1>Seleção acessível de produto</h1>
        <p>Exemplo local. Não há compra, pagamento ou envio de dados.</p>
        <ProductCard broken={broken} />
      </main>
    </>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Contêiner React não encontrado.');
createRoot(container).render(<Storefront />);
