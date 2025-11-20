import express from "express";
import { Client } from "../models/Client.js";
import { Session } from "../models/Session.js";
import authMiddleware from "..middleware/auth";