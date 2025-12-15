import FileUploadZone from '../FileUploadZone'

export default function FileUploadZoneExample() {
  return (
    <div className="max-w-2xl">
      <FileUploadZone accept="application/pdf" multiple={true} />
    </div>
  )
}
