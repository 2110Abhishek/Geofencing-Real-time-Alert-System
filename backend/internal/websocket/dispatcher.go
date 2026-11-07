package websocket

import (
	"encoding/json"
	"log"

	"geotrack/backend/internal/models"
)

// Dispatcher decouples event generation from WebSocket distribution via buffered queue.
type Dispatcher struct {
	hub       *Hub
	eventChan chan models.WSAlertPayload
}

func NewDispatcher(hub *Hub) *Dispatcher {
	d := &Dispatcher{
		hub:       hub,
		eventChan: make(chan models.WSAlertPayload, 1024),
	}
	go d.process()
	return d
}

func (d *Dispatcher) Enqueue(payload models.WSAlertPayload) {
	select {
	case d.eventChan <- payload:
	default:
		log.Printf("[Dispatcher] Warning: Alert event buffer full. Event ID: %s dropped from broadcast queue.", payload.EventID)
	}
}

func (d *Dispatcher) process() {
	for event := range d.eventChan {
		bytes, err := json.Marshal(event)
		if err != nil {
			log.Printf("[Dispatcher] Error serializing alert payload: %v", err)
			continue
		}
		d.hub.Broadcast(bytes)
	}
}

