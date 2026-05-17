interface NotificationsWidgetProps {
  count?: number;
}

export function NotificationsWidget({ count = 0 }: NotificationsWidgetProps) {
  return (
    <div className="text-center py-4 text-gray-500">
      <p className="text-sm">{count > 0 ? `${count} unread` : 'No new notifications'}</p>
    </div>
  );
}
