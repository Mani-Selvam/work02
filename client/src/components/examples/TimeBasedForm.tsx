import TimeBasedForm from '../TimeBasedForm'

export default function TimeBasedFormExample() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <TimeBasedForm type="morning" userName="Sarah" />
      <TimeBasedForm type="evening" userName="John" />
    </div>
  )
}
