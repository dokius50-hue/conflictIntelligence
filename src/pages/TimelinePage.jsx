import { useState } from 'react';
import EventTimeline from './EventTimeline';
import CausalChainPanel from '../components/CausalChainPanel';

/**
 * Standalone event timeline with causal chain panel.
 * Clicking an event opens the causal chain panel below the list.
 */
export default function TimelinePage() {
  const [selectedEvent, setSelectedEvent] = useState(null);

  function handleEventClick(event) {
    setSelectedEvent((prev) => (prev?.id === event.id ? null : event));
  }

  return (
    <div className="space-y-4">
      <EventTimeline
        standalone
        onEventClick={handleEventClick}
        activeEventId={selectedEvent?.id}
      />
      {selectedEvent && (
        <CausalChainPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
