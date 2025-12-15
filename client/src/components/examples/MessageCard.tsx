import MessageCard from '../MessageCard'
import { useState } from 'react'

export default function MessageCardExample() {
  const [messages, setMessages] = useState([
    { id: "1", message: "New task assigned: Complete Q4 Sales Report. Please review the requirements.", timestamp: new Date(), isRead: false, relatedTask: "Q4 Sales Report" },
    { id: "2", message: "Great work on the marketing analysis! Keep it up.", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), isRead: true },
  ])

  const markAsRead = (id: string) => {
    setMessages(messages.map(msg => msg.id === id ? { ...msg, isRead: true } : msg))
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {messages.map(msg => (
        <MessageCard
          key={msg.id}
          {...msg}
          onMarkRead={() => markAsRead(msg.id)}
        />
      ))}
    </div>
  )
}
