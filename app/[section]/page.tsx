import { notFound, redirect } from 'next/navigation';
import Portal from '../Portal';
import { portalMarkup } from '../portal-markup';
const sections = new Set(['workspace', 'linkers', 'cloud', 'future-work', 'games', 'synthesis', 'federated', 'datasets', 'research', 'vault', 'red-room', 'admin', 'download', 'orders', 'chat']);
export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === 'viewer') redirect('/viewer.html');
  if (!sections.has(section)) notFound();
  return <Portal markup={portalMarkup} />;
}
