-- Create partial unique index ensuring at most one active SERVING ticket per counter
CREATE UNIQUE INDEX "unique_serving_ticket_per_counter" ON "tickets"("counter_id") WHERE "status" = 'SERVING';
