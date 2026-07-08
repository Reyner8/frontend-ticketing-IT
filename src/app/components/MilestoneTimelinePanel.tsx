import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import {
  fetchFeatureMilestones,
  fetchFeatureTimeline,
  createMilestone,
  completeMilestone,
  deleteMilestone,
  createTimelineEntry,
  deleteTimelineEntry,
} from "../lib/api/services";
import type { Milestone, TimelineEntry } from "../types";

interface MilestoneTimelinePanelProps {
  featureId: string;
}

export function MilestoneTimelinePanel({ featureId }: MilestoneTimelinePanelProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [msTitle, setMsTitle] = useState("");
  const [msDate, setMsDate] = useState("");
  const [tlPhase, setTlPhase] = useState("development");
  const [tlTitle, setTlTitle] = useState("");
  const [tlDescription, setTlDescription] = useState("");

  const load = async () => {
    try {
      const [ms, tl] = await Promise.all([
        fetchFeatureMilestones(featureId),
        fetchFeatureTimeline(featureId),
      ]);
      setMilestones(ms);
      setTimeline(tl);
    } catch {
      setMilestones([]);
      setTimeline([]);
    }
  };

  useEffect(() => {
    load();
  }, [featureId]);

  const addMilestone = async () => {
    if (!msTitle.trim() || !msDate) return;
    try {
      await createMilestone(featureId, {
        title: msTitle.trim(),
        target_date: msDate,
      });
      setMsTitle("");
      setMsDate("");
      await load();
      toast.success("Milestone created");
    } catch {
      toast.error("Failed to create milestone");
    }
  };

  const addTimeline = async () => {
    if (!tlTitle.trim() || !tlDescription.trim()) return;
    try {
      await createTimelineEntry(featureId, {
        phase: tlPhase,
        title: tlTitle.trim(),
        description: tlDescription.trim(),
      });
      setTlTitle("");
      setTlDescription("");
      await load();
      toast.success("Timeline entry created");
    } catch {
      toast.error("Failed to create timeline entry");
    }
  };

  return (
    <Tabs defaultValue="milestones">
      <TabsList>
        <TabsTrigger value="milestones">Milestones</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
      </TabsList>
      <TabsContent value="milestones" className="space-y-4 mt-4">
        <ScrollArea className="h-[240px] pr-4">
          <div className="space-y-2">
            {milestones.map((m) => (
              <div key={m.id} className="border rounded-md p-3 text-sm flex justify-between gap-2">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-muted-foreground">
                    Target: {format(m.targetDate, "PP")} · {m.progress}%
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!m.isCompleted && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await completeMilestone(featureId, m.id);
                        await load();
                      }}
                    >
                      Complete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await deleteMilestone(featureId, m.id);
                      await load();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input placeholder="Title" value={msTitle} onChange={(e) => setMsTitle(e.target.value)} />
          <Input type="date" value={msDate} onChange={(e) => setMsDate(e.target.value)} />
          <Button onClick={addMilestone}>Add Milestone</Button>
        </div>
      </TabsContent>
      <TabsContent value="timeline" className="space-y-4 mt-4">
        <ScrollArea className="h-[240px] pr-4">
          <div className="space-y-2">
            {timeline.map((e) => (
              <div key={e.id} className="border rounded-md p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{e.phase}</Badge>
                  <span className="font-medium">{e.title}</span>
                </div>
                <p className="text-muted-foreground">{e.description}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={async () => {
                    await deleteTimelineEntry(featureId, e.id);
                    await load();
                  }}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Phase" value={tlPhase} onChange={(e) => setTlPhase(e.target.value)} />
            <Input placeholder="Title" value={tlTitle} onChange={(e) => setTlTitle(e.target.value)} />
          </div>
          <Textarea
            placeholder="Description"
            value={tlDescription}
            onChange={(e) => setTlDescription(e.target.value)}
            rows={2}
          />
          <Button onClick={addTimeline}>Add Timeline Entry</Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
