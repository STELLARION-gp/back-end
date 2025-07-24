import { Request, Response } from 'express';
// import axios from 'axios'; // Uncomment when making real API calls

// Types for NASA opportunities
interface NasaOpportunity {
  id: string;
  title: string;
  description: string;
  type: 'internship' | 'volunteer' | 'citizen-science';
  startDate?: string;
  endDate?: string;
  deadline?: string;
  url: string;
  location: string;
  remote: boolean;
  skills: string[];
  eligibility: string[];
  source: 'NASA' | 'VolunteerMatch' | 'TechPort';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  timeCommitment: string;
  image?: string;
}

// Mock data for demonstration - in production, this would come from actual APIs
const mockOpportunities: NasaOpportunity[] = [
  {
    id: '1',
    title: 'NASA USRP Summer Internship Program',
    description: 'The Undergraduate Student Research Program (USRP) provides unique research opportunities for students to work with NASA scientists and engineers.',
    type: 'internship',
    startDate: '2025-06-01',
    endDate: '2025-08-15',
    deadline: '2025-03-15',
    url: 'https://nasa.gov/learning-resources/internship-programs/',
    location: 'Multiple NASA Centers',
    remote: false,
    skills: ['Research', 'Engineering', 'Science'],
    eligibility: ['Undergraduate students', 'US Citizens', 'GPA 3.0+'],
    source: 'NASA',
    difficulty: 'Intermediate',
    timeCommitment: '40 hours/week',
    image: 'https://www.nasa.gov/wp-content/uploads/2023/03/jsc2019e069201.jpg'
  },
  {
    id: '2',
    title: 'GLOBE Observer - Cloud Observations',
    description: 'Help NASA scientists by taking photos of clouds and matching them to satellite observations. Contribute to climate research from anywhere.',
    type: 'citizen-science',
    startDate: '2025-01-01',
    url: 'https://www.globe.gov/globe-observer',
    location: 'Worldwide',
    remote: true,
    skills: ['Photography', 'Observation', 'Mobile Apps'],
    eligibility: ['All ages', 'Mobile device required'],
    source: 'NASA',
    difficulty: 'Beginner',
    timeCommitment: '15-30 minutes/day',
    image: 'https://www.nasa.gov/wp-content/uploads/2023/03/globe-observer-clouds.jpg'
  }
];

/**
 * Get all NASA opportunities with filtering
 */
export const getAllOpportunities = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      type, 
      difficulty, 
      remote, 
      search,
      limit = 20,
      offset = 0 
    } = req.query;

    let filteredOpportunities = [...mockOpportunities];

    // Apply filters
    if (type && type !== 'all') {
      filteredOpportunities = filteredOpportunities.filter(opp => opp.type === type);
    }

    if (difficulty && difficulty !== 'all') {
      filteredOpportunities = filteredOpportunities.filter(opp => opp.difficulty === difficulty);
    }

    if (remote === 'true') {
      filteredOpportunities = filteredOpportunities.filter(opp => opp.remote);
    }

    if (search) {
      const searchTerm = search.toString().toLowerCase();
      filteredOpportunities = filteredOpportunities.filter(opp => 
        opp.title.toLowerCase().includes(searchTerm) ||
        opp.description.toLowerCase().includes(searchTerm) ||
        opp.skills.some(skill => skill.toLowerCase().includes(searchTerm))
      );
    }

    // Apply pagination
    const startIndex = parseInt(offset.toString());
    const endIndex = startIndex + parseInt(limit.toString());
    const paginatedOpportunities = filteredOpportunities.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedOpportunities,
      meta: {
        total: filteredOpportunities.length,
        limit: parseInt(limit.toString()),
        offset: parseInt(offset.toString()),
        hasMore: endIndex < filteredOpportunities.length
      }
    });
  } catch (error) {
    console.error('Error fetching NASA opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch NASA opportunities',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get NASA TechPort projects (demonstration of real API integration)
 */
export const getTechPortProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    // This would use the actual NASA TechPort API
    // For demonstration, we'll simulate the API call
    const techPortUrl = 'https://api.nasa.gov/techport/api/projects';
    
    // In production, you would make actual API calls:
    // const response = await axios.get(techPortUrl, {
    //   params: {
    //     api_key: process.env.NASA_API_KEY
    //   }
    // });

    // Mock response for demonstration
    const mockTechPortData = {
      projects: [
        {
          id: 'tech_001',
          title: 'Advanced Propulsion Systems Research',
          description: 'Developing next-generation propulsion technologies for deep space missions.',
          technology: ['Propulsion', 'Deep Space'],
          status: 'Active',
          center: 'Glenn Research Center'
        }
      ]
    };

    res.json({
      success: true,
      data: mockTechPortData,
      message: 'TechPort data retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching TechPort data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch TechPort data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get NASA citizen science projects
 */
export const getCitizenScienceProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    // In production, this would scrape or use APIs from NASA citizen science pages
    const citizenScienceProjects = mockOpportunities.filter(opp => opp.type === 'citizen-science');

    res.json({
      success: true,
      data: citizenScienceProjects,
      message: 'Citizen science projects retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching citizen science projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch citizen science projects',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get opportunity statistics
 */
export const getOpportunityStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = {
      total: mockOpportunities.length,
      byType: {
        internship: mockOpportunities.filter(opp => opp.type === 'internship').length,
        volunteer: mockOpportunities.filter(opp => opp.type === 'volunteer').length,
        'citizen-science': mockOpportunities.filter(opp => opp.type === 'citizen-science').length
      },
      byDifficulty: {
        Beginner: mockOpportunities.filter(opp => opp.difficulty === 'Beginner').length,
        Intermediate: mockOpportunities.filter(opp => opp.difficulty === 'Intermediate').length,
        Advanced: mockOpportunities.filter(opp => opp.difficulty === 'Advanced').length
      },
      remote: mockOpportunities.filter(opp => opp.remote).length,
      onSite: mockOpportunities.filter(opp => !opp.remote).length
    };

    res.json({
      success: true,
      data: stats,
      message: 'Opportunity statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching opportunity statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch opportunity statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Submit application interest (demonstration endpoint)
 */
export const submitApplicationInterest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { opportunityId, userEmail, message } = req.body;

    if (!opportunityId || !userEmail) {
      res.status(400).json({
        success: false,
        message: 'Opportunity ID and user email are required'
      });
      return;
    }

    // Find the opportunity
    const opportunity = mockOpportunities.find(opp => opp.id === opportunityId);
    if (!opportunity) {
      res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
      return;
    }

    // In production, this would:
    // 1. Save the interest to database
    // 2. Send notification emails
    // 3. Track analytics
    
    console.log(`Application interest submitted:`, {
      opportunityId,
      userEmail,
      message,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Application interest submitted successfully',
      data: {
        opportunityTitle: opportunity.title,
        submittedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error submitting application interest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application interest',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
