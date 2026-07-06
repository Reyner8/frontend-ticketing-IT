import { CheckCircle, Clock, AlertTriangle, Lightbulb, Zap } from "lucide-react";
import { TicketStatus } from '../types';

interface StatusIconProps {
  status: TicketStatus | 'ongoing' | 'resolved';
  className?: string;
}

export function StatusIcon({ status, className = "h-4 w-4" }: StatusIconProps) {
  switch (status) {
    case 'resolved':
    case 'closed':
      return <CheckCircle className={`${className} text-green-600`} />;
    case 'in_progress':
      return <Clock className={`${className} text-blue-600`} />;
    case 'pending_approval':
      return <Lightbulb className={`${className} text-yellow-600`} />;
    case 'assigned':
      return <Clock className={`${className} text-blue-500`} />;
    case 'waiting_for_user':
      return <AlertTriangle className={`${className} text-orange-600`} />;
    case 'ongoing':
      return <AlertTriangle className={`${className} text-red-600`} />;
    default:
      return <Clock className={`${className} text-gray-600`} />;
  }
}