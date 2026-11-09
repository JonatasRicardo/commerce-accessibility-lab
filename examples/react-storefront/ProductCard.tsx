import { useId, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

type ProductCardProps = { broken?: boolean };

export function ProductCard({ broken = false }: ProductCardProps) {
  const sizeId = useId();
  const stockId = useId();
  const titleId = useId();
  const [size, setSize] = useState('M');
  const [status, setStatus] = useState('Nenhuma reserva simulada.');

  return (
    <article aria-labelledby={titleId}>
      <h2 id={titleId}>Camisa demonstrativa</h2>
      <p>R$ 129,00 — produto fictício para testes de interface.</p>
      <label htmlFor={sizeId}>Tamanho</label>
      <select id={sizeId} value={size} aria-describedby={stockId} onChange={event => setSize(event.target.value)}>
        <option value="P">P</option>
        <option value="M">M</option>
        <option value="G" disabled>G — esgotado</option>
      </select>
      <p id={stockId}>P e M disponíveis. G está esgotado.</p>
      <Dialog.Root>
        {/* The negative control retains the library but removes its trigger's usable name. */}
        <Dialog.Trigger aria-label={broken ? undefined : 'Revisar seleção'}>
          <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2" d="M5 7h14v14H5z M9 7V5a3 3 0 0 1 6 0v2" /></svg>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="dialog">
            <Dialog.Title>Revisar seleção da camisa</Dialog.Title>
            <Dialog.Description>Confirme o tamanho antes de concluir a reserva simulada.</Dialog.Description>
            <p>Tamanho escolhido: <strong>{size}</strong></p>
            <Dialog.Close asChild>
              <button type="button" onClick={() => setStatus(`Reserva simulada: camisa tamanho ${size}.`)}>Confirmar reserva simulada</button>
            </Dialog.Close>
            <Dialog.Close>Voltar ao produto</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <p role="status">{status}</p>
    </article>
  );
}
