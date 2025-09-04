"use client"
import { useState, useEffect } from "react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { QueueItem } from "./QueueItem"
import { RefreshCw, Users, Clock, CheckCircle, AlertTriangle } from "lucide-react"
import type { QueueItem as QueueItemType, VisitStatus } from "../../types"

interface QueueStats {
  today: number
  waiting: number
  inProgress: number
  completed: number
}

export function QueueBoard() {
  const [queueItems, setQueueItems] = useState<QueueItemType[]>([])
  const [stats, setStats] = useState<QueueStats>({
    today: 0,
    waiting: 0,
    inProgress: 0,
    completed: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const fetchQueue = async () => {
    try {
      const response = await fetch("/api/visits/queue", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch queue")
      }

      const result = await response.json()
      setQueueItems(result.data.queue)
      setStats(result.data.stats)
      setError("")
    } catch (err: any) {
      setError(err.message || "Failed to load queue")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()

    // Refresh queue every 30 seconds
    const interval = setInterval(fetchQueue, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setQueueItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const updateVisitStatus = async (visitId: string, status: VisitStatus) => {
    try {
      const response = await fetch(`/api/visits/${visitId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error("Failed to update visit status")
      }

      // Refresh queue after status update
      fetchQueue()
    } catch (err: any) {
      setError(err.message || "Failed to update status")
    }
  }

  const getStatusColor = (status: VisitStatus) => {
    switch (status) {
      case "REGISTERED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "TRIAGED":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "WAITING_CONSULTATION":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
      case "IN_CONSULTATION":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "WAITING_LAB":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
      case "LAB_RESULTS_READY":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400"
      case "WAITING_PHARMACY":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400"
      case "COMPLETED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  const getPriorityColor = (priority: "HIGH" | "MEDIUM" | "LOW") => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
      case "LOW":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Patients</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Waiting</p>
                <p className="text-2xl font-bold">{stats.waiting}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Board */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Patient Queue</CardTitle>
              <CardDescription>Drag and drop to reorder patients in the queue</CardDescription>
            </div>
            <Button onClick={fetchQueue} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {queueItems.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No patients in queue</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={queueItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {queueItems.map((item) => (
                    <QueueItem
                      key={item.id}
                      item={item}
                      onStatusUpdate={updateVisitStatus}
                      getStatusColor={getStatusColor}
                      getPriorityColor={getPriorityColor}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
