"use client";
import { useState, useEffect } from "react";

export default function TimeFrame({ timeFrame }: { timeFrame: number }) {

  return (
    <div>
      <p>Time Frame: {timeFrame}</p>
    </div>
  );
}
