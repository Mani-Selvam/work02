import RatingBadge from '../RatingBadge'

export default function RatingBadgeExample() {
  return (
    <div className="space-y-4 max-w-2xl">
      <RatingBadge
        rating="Excellent"
        feedback="Outstanding performance this month! Your reports are always thorough and submitted on time."
        timestamp={new Date()}
        period="November 2024"
      />
      <RatingBadge
        rating="Good"
        feedback="Solid work overall. Focus on improving task completion speed."
        timestamp={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
        period="October 2024"
      />
    </div>
  )
}
