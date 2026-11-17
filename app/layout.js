import './globals.css';
import Shell from '@/components/Shell';

export const metadata = { title: 'BatteryPassport', description: 'EV battery lifecycle, traceability and second-life assessment' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
