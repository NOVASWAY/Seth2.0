"use client"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { GripVertical, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { QueueItem as QueueItemType, VisitStatus } from "../../types"

interface QueueItemProps {
  item: QueueItemType
  onStatusUpdate: (visitId: string, status: VisitStatus) => void
  getStatusColor: (status: VisitStatus) => string
  getPriorityColor: (priority: "HIGH" | "MEDIUM" | "LOW") => string
}

export function QueueItem({ item, onStatusUpdate, getStatusColor, getPriorityColor }: QueueItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleStatusChange = (newStatus: VisitStatus) => {
    onStatusUpdate(item.visitId, newStatus)
  }

  const getNextStatus = (currentStatus: VisitStatus): VisitStatus | null => {
    switch (currentStatus) {
      case "REGISTERED":
        return "TRIAGED"
      case "TRIAGED":
        return "WAITING_CONSULTATION"
      case "WAITING_CONSULTATION":
        return "IN_CONSULTATION"
      case "IN_CONSULTATION":
        return "WAITING_PHARMACY"
      case "WAITING_LAB":
        return "LAB_RESULTS_READY"
      case "LAB_RESULTS_READY":
        return "WAITING_CONSULTATION"
      case "WAITING_PHARMACY":
        return "COMPLETED"
      default:
        return null
    }
  }

  const nextStatus = getNextStatus(item.status)

  return (
    <Card ref={setNodeRef} style={style} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Drag Handle */}
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Queue Position */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">{item.queuePosition}</span>
            </div>
          </div>

          {/* Patient Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{item.patientName}</h4>
              <Badge variant="outline" className="text-xs">
                {item.opNumber}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {/* Priority Badge */}
          <div className="flex-shrink-0">
            <Badge className={getPriorityColor(item.priority)} variant="outline">
              {item.priority}
            </Badge>
          </div>

          {/* Status Badge */}
          <div className="flex-shrink-0">
            <Badge className={getStatusColor(item.status)}>{item.status.replace(/_/g, " ")}</Badge>
          </div>

          {/* Status Actions */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Select value={item.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REGISTERED">Registered</SelectItem>
                <SelectItem value="TRIAGED">Triaged</SelectItem>
                <SelectItem value="WAITING_CONSULTATION">Waiting Consultation</SelectItem>
                <SelectItem value="IN_CONSULTATION">In Consultation</SelectItem>
                <SelectItem value="WAITING_LAB">Waiting Lab</SelectItem>
                <SelectItem value="LAB_RESULTS_READY">Lab Results Ready</SelectItem>
                <SelectItem value="WAITING_PHARMACY">Waiting Pharmacy</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>

            {nextStatus && (
              <Button size="sm" onClick={() => handleStatusChange(nextStatus)} className="whitespace-nowrap">
                Next: {nextStatus.replace(/_/g, " ")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
