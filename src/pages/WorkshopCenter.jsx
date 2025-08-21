export default function WorkshopCenter() {
  return (
    <div>
      Workshop Center
    </div>
  );
}

export function createPageUrl(pageName) {
  return '/' + pageName.toLowerCase().replace(/ /g, '-');
}
