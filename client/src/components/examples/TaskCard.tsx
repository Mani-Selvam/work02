import TaskCard from '../TaskCard'

export default function TaskCardExample() {
  return (
    <div className="space-y-4 max-w-2xl">
      <TaskCard
        id="1"
        title="Complete Q4 Sales Report"
        description="Prepare comprehensive sales analysis for Q4 including regional breakdowns, customer segments, and revenue projections."
        priority="High"
        deadline={new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)}
        status="In Progress"
        assignedDate={new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)}
      />
      <TaskCard
        id="2"
        title="Review Team Performance"
        description="Conduct individual performance reviews for team members and prepare feedback."
        priority="Medium"
        deadline={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
        status="Pending"
        assignedDate={new Date()}
      />
    </div>
  )
}
