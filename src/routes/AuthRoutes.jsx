import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Paraphraser from "../views/paraphraser";
import Humanizer from "../views/humanizer";
import AppLayout from "../layout";
import Dashboard from "../views/dashboard";
import GrammarAndStyle from "../views/grammar";
import AiDetector from "../views/ai-detector";
import Summarizer from "../views/summarizer";
import PlagiarismChecker from "../views/plagiarism";
import CitationGenerator from "../views/citations";
import Profile from "../views/profile";

export default function AuthRoutes() {
  return (
    <Routes>
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="paraphraser" element={<Paraphraser />} />
        <Route path="humanizer" element={<Humanizer />} />
        <Route path="grammar" element={<GrammarAndStyle />} />
        <Route path="ai-detector" element={<AiDetector />} />
        <Route path="summarizer" element={<Summarizer />} />
        <Route path="plagiarism" element={<PlagiarismChecker />} />
        <Route path="citations" element={<CitationGenerator />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
