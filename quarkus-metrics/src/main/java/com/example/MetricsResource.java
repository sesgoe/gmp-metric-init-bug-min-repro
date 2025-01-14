package com.example;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/metric")
public class MetricsResource {

    @Inject
    MeterRegistry registry;

    @GET
    @Path("/{name}/{count}")
    @Produces(MediaType.TEXT_PLAIN)
    public String incrementMetric(@PathParam("name") String name, @PathParam("count") int count) {
        for (int i = 0; i < count; i++) {
            registry.counter(name).increment();
        }
        return String.format("Incremented metric '%s' by %d", name, count);
    }
}
